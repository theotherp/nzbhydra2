import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../api/transport";
import type {BootstrapData} from "../../bootstrap";
import {ToastProvider} from "../../components/toasts/ToastProvider";
import {LoginOutButton, loginoutAffordance} from "./LoginOutButton";

const mockRouterNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
    useLocation: ({
        select,
    }: {
        select: (location: {pathname: string}) => string;
    }) => select({pathname: mockPathname}),
    useNavigate: () => mockRouterNavigate,
}));

let mockPathname = "/hydra/";

const bootstrap: BootstrapData = {
    adminRestricted: true,
    authConfigured: true,
    authType: "FORM",
    baseUrl: "/hydra/",
    maySeeAdmin: false,
    maySeeDetailsDl: false,
    maySeeSearch: true,
    maySeeStats: false,
    safeConfig: null,
    searchRestricted: false,
    serverTimeZone: null,
    showIndexerSelection: false,
    showLogout: false,
    statsRestricted: false,
    username: null,
};

/**
 * What `GET /internalapi/askpassword` really answers with once the browser's
 * credential prompt has been accepted: `AuthWeb.askForPassword` returns
 * `UserInfosProvider.getUserInfos`, which — unlike `/internalapi/userinfos` —
 * never sets `baseUrl` or `safeConfig`, so both serialize as `null`. This is
 * deliberately *not* `BootstrapData`: running it through the bootstrap
 * validator is what used to break the whole BASIC branch in production.
 */
const askPasswordResponse = {
    adminRestricted: true,
    authConfigured: true,
    authType: "BASIC",
    baseUrl: null,
    maySeeAdmin: true,
    maySeeDetailsDl: true,
    maySeeSearch: true,
    maySeeStats: true,
    safeConfig: null,
    searchRestricted: false,
    serverTimeZone: "UTC",
    showIndexerSelection: true,
    showLogout: true,
    statsRestricted: false,
    username: "hydra",
};

afterEach(cleanup);
beforeEach(() => {
    mockPathname = "/hydra/";
    mockRouterNavigate.mockReset();
    window.sessionStorage.clear();
});

describe("loginoutAffordance", () => {
    it("should hide the affordance when no authentication is configured", () => {
        expect(
            loginoutAffordance({...bootstrap, authConfigured: false}, false),
        ).toBeNull();
    });

    it("should show a named logout for a logged-in session that may log out", () => {
        expect(
            loginoutAffordance(
                {...bootstrap, showLogout: true, username: "hydra"},
                false,
            ),
        ).toEqual({label: "Logout hydra", loggedIn: true});
    });

    it("should hide the affordance for a logged-in session that may not log out", () => {
        expect(
            loginoutAffordance(
                {...bootstrap, showLogout: false, username: "hydra"},
                false,
            ),
        ).toBeNull();
    });

    it("should show a login for an anonymous session when any area is restricted", () => {
        for (const restriction of [
            {adminRestricted: true},
            {statsRestricted: true},
            {searchRestricted: true},
        ]) {
            expect(
                loginoutAffordance(
                    {
                        ...bootstrap,
                        adminRestricted: false,
                        statsRestricted: false,
                        searchRestricted: false,
                        ...restriction,
                    },
                    false,
                ),
            ).toEqual({label: "Login", loggedIn: false});
        }
    });

    it("should hide the login for an anonymous session with nothing restricted", () => {
        expect(
            loginoutAffordance(
                {
                    ...bootstrap,
                    adminRestricted: false,
                    searchRestricted: false,
                    statsRestricted: false,
                },
                false,
            ),
        ).toBeNull();
    });

    it("should hide the login while the login page itself is the current route", () => {
        expect(loginoutAffordance(bootstrap, true)).toBeNull();
    });
});

describe("LoginOutButton", () => {
    it("should render nothing on the login route", () => {
        mockPathname = "/hydra/login";
        renderButton(bootstrap, vi.fn());

        expect(screen.queryByTestId("shell-loginout")).not.toBeInTheDocument();
    });

    it("should send an anonymous FORM session to the login route", async () => {
        renderButton(bootstrap, vi.fn());

        fireEvent.click(screen.getByTestId("shell-loginout"));

        expect(mockRouterNavigate).toHaveBeenCalledWith({to: "/login"});
    });

    it("should tell an anonymous session of another auth type that it need not log in", async () => {
        renderButton({...bootstrap, authType: "NONE"}, vi.fn());

        fireEvent.click(screen.getByTestId("shell-loginout"));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "You shouldn't need to login but here you go!",
        );
    });

    it("should trigger the browser credential challenge for an anonymous BASIC session", async () => {
        const navigate = vi.fn();
        const fetchImplementation = vi
            .fn()
            .mockImplementation(() =>
                Promise.resolve(jsonResponse(askPasswordResponse)),
            );
        renderButton(
            {...bootstrap, authType: "BASIC"},
            navigate,
            fetchImplementation,
        );

        fireEvent.click(screen.getByTestId("shell-loginout"));

        await waitFor(() => expect(navigate).toHaveBeenCalledWith("/hydra/"));
        expect(fetchImplementation.mock.calls[0][0]).toBe(
            "http://localhost:3000/hydra/internalapi/askpassword",
        );
    });

    it("should pass the remembered user name to a BASIC challenge after a logout", async () => {
        const loggedOut = {...bootstrap, maySeeSearch: true, username: null};
        // Each endpoint answers with what it really answers with: the logout
        // confirmation is a full bootstrap from `/internalapi/userinfos`, the
        // challenge is the `baseUrl`-less user infos of `/askpassword`.
        const fetchImplementation = vi
            .fn()
            .mockImplementation((url: string) =>
                Promise.resolve(
                    jsonResponse(
                        url.includes("askpassword")
                            ? askPasswordResponse
                            : loggedOut,
                    ),
                ),
            );
        const {unmount} = renderButton(
            {
                ...bootstrap,
                authType: "BASIC",
                showLogout: true,
                username: "hydra",
            },
            vi.fn(),
            fetchImplementation,
        );

        fireEvent.click(screen.getByTestId("shell-loginout"));
        await waitFor(() =>
            expect(window.sessionStorage.length).toBeGreaterThan(0),
        );
        unmount();

        // The full document navigation is what really re-enters the app; the
        // second render stands in for the page the server then delivers.
        fetchImplementation.mockClear();
        renderButton(
            {...bootstrap, authType: "BASIC"},
            vi.fn(),
            fetchImplementation,
        );
        fireEvent.click(screen.getByTestId("shell-loginout"));

        await waitFor(() =>
            expect(fetchImplementation.mock.calls[0][0]).toBe(
                "http://localhost:3000/hydra/internalapi/askpassword?old_username=hydra",
            ),
        );
    });

    it("should log out and re-enter the application at the search area", async () => {
        const navigate = vi.fn();
        const fetchImplementation = vi
            .fn()
            .mockResolvedValueOnce(new Response(null, {status: 200}))
            .mockResolvedValueOnce(
                jsonResponse({...bootstrap, maySeeSearch: true}),
            );
        renderButton(
            {...bootstrap, showLogout: true, username: "hydra"},
            navigate,
            fetchImplementation,
        );

        fireEvent.click(screen.getByTestId("shell-loginout"));

        await waitFor(() =>
            expect(navigate).toHaveBeenCalledWith("/hydra/", ""),
        );
        expect(fetchImplementation.mock.calls[0][0]).toBe(
            "http://localhost:3000/hydra/logout",
        );
    });

    it("should log out to the login page when the anonymous session may not search", async () => {
        const navigate = vi.fn();
        const fetchImplementation = vi
            .fn()
            .mockResolvedValueOnce(new Response(null, {status: 200}))
            .mockResolvedValueOnce(
                jsonResponse({
                    ...bootstrap,
                    maySeeSearch: false,
                    searchRestricted: true,
                }),
            );
        renderButton(
            {...bootstrap, showLogout: true, username: "hydra"},
            navigate,
            fetchImplementation,
        );

        fireEvent.click(screen.getByTestId("shell-loginout"));

        await waitFor(() =>
            expect(navigate).toHaveBeenCalledWith("/hydra/", "login"),
        );
    });

    it("should report a failed logout instead of leaving the page silently unchanged", async () => {
        const navigate = vi.fn();
        const fetchImplementation = vi
            .fn()
            .mockImplementation(() =>
                Promise.resolve(new Response(null, {status: 500})),
            );
        renderButton(
            {...bootstrap, showLogout: true, username: "hydra"},
            navigate,
            fetchImplementation,
        );

        fireEvent.click(screen.getByTestId("shell-loginout"));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Logout failed!",
        );
        expect(navigate).not.toHaveBeenCalled();
    });
});

function renderButton(
    data: BootstrapData,
    navigate: (baseUrl: string, path?: string) => void,
    fetchImplementation: typeof fetch = vi.fn(),
) {
    return render(
        <ToastProvider>
            <LoginOutButton
                bootstrap={data}
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
