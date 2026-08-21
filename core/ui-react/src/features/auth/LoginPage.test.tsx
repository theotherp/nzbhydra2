import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../api/transport";
import type {BootstrapData} from "../../bootstrap";
import {ToastProvider} from "../../components/toasts/ToastProvider";
import {LoginPage} from "./LoginPage";

const bootstrap: BootstrapData = {
    adminRestricted: true,
    authConfigured: true,
    authType: "FORM",
    baseUrl: "/hydra/",
    maySeeAdmin: false,
    maySeeDetailsDl: false,
    maySeeSearch: false,
    maySeeStats: false,
    safeConfig: null,
    searchRestricted: true,
    serverTimeZone: null,
    showIndexerSelection: false,
    showLogout: true,
    statsRestricted: true,
    username: null,
};

afterEach(cleanup);

describe("LoginPage", () => {
    it("should render legacy's heading, fields, and forwarding note", () => {
        renderPage(vi.fn(), vi.fn());

        expect(
            screen.getByRole("heading", {name: "Log in"}),
        ).toBeInTheDocument();
        expect(screen.getByLabelText("Username")).toHaveFocus();
        expect(screen.getByLabelText("Password")).toHaveAttribute(
            "type",
            "password",
        );
        expect(
            screen.getByText("You will be forwarded to the search area."),
        ).toBeInTheDocument();
        expect(screen.getByTestId("login-username")).toBe(
            screen.getByLabelText("Username"),
        );
        expect(screen.getByTestId("login-password")).toBe(
            screen.getByLabelText("Password"),
        );
    });

    it("should keep submission disabled until both credentials are entered", () => {
        renderPage(vi.fn(), vi.fn());

        const submit = screen.getByTestId("login-submit");
        expect(submit).toBeDisabled();

        fireEvent.change(screen.getByTestId("login-username"), {
            target: {value: "hydra"},
        });
        expect(submit).toBeDisabled();

        fireEvent.change(screen.getByTestId("login-password"), {
            target: {value: "secret"},
        });
        expect(submit).toBeEnabled();
    });

    it("should post form-encoded credentials, confirm the session, and re-enter the application", async () => {
        const navigate = vi.fn();
        const fetchImplementation = vi
            .fn()
            .mockResolvedValueOnce(new Response(null, {status: 200}))
            .mockResolvedValueOnce(
                jsonResponse({...bootstrap, username: "hydra"}),
            );
        renderPage(navigate, fetchImplementation);

        submitCredentials();

        await waitFor(() => expect(navigate).toHaveBeenCalledWith("/hydra/"));
        expect(fetchImplementation.mock.calls[0][0]).toBe(
            "http://localhost:3000/hydra/login",
        );
        const request = fetchImplementation.mock.calls[0][1] as RequestInit;
        expect(request.method).toBe("POST");
        expect(request.body?.toString()).toBe("username=hydra&password=secret");
        expect(fetchImplementation.mock.calls[1][0]).toBe(
            "http://localhost:3000/hydra/internalapi/userinfos",
        );
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Login successful!",
        );
    });

    it("should report a failed login and keep the form on the page", async () => {
        const navigate = vi.fn();
        const fetchImplementation = vi
            .fn()
            .mockImplementation(() =>
                Promise.resolve(new Response(null, {status: 401})),
            );
        renderPage(navigate, fetchImplementation);

        submitCredentials();

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Login failed!",
        );
        expect(navigate).not.toHaveBeenCalled();
        expect(screen.getByTestId("login-username")).toHaveValue("hydra");
        expect(screen.getByTestId("login-submit")).toBeEnabled();
    });
});

function submitCredentials() {
    fireEvent.change(screen.getByTestId("login-username"), {
        target: {value: "hydra"},
    });
    fireEvent.change(screen.getByTestId("login-password"), {
        target: {value: "secret"},
    });
    fireEvent.click(screen.getByTestId("login-submit"));
}

function renderPage(
    navigate: (baseUrl: string, path?: string) => void,
    fetchImplementation: typeof fetch,
) {
    return render(
        <ToastProvider>
            <LoginPage
                bootstrap={bootstrap}
                navigate={navigate}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
            />
        </ToastProvider>,
    );
}

function jsonResponse(value: unknown): Response {
    return new Response(JSON.stringify(value), {
        headers: {"Content-Type": "application/json"},
    });
}
