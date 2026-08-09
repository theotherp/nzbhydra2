import {ApiTransport} from "../../api/transport";
import {type BootstrapData, getBootstrapData} from "../../bootstrap";

export type FormCredentials = {
    password: string;
    username: string;
};

export async function loginWithForm(
    transport: ApiTransport,
    credentials: FormCredentials,
): Promise<BootstrapData> {
    await transport.request<void>("login", {
        form: new URLSearchParams(credentials),
        method: "POST",
    });
    return currentSession(transport);
}

export async function logout(transport: ApiTransport): Promise<BootstrapData> {
    await transport.request<void>("logout", {method: "POST"});
    return currentSession(transport);
}

export async function currentSession(
    transport: ApiTransport,
): Promise<BootstrapData> {
    return getBootstrapData(
        await transport.request<unknown>("internalapi/userinfos"),
    );
}
