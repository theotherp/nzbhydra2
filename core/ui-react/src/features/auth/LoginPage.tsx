import {Box, Button, Paper, Stack, TextField, Typography} from "@mui/material";
import {useForm} from "react-hook-form";

import {ApiTransport} from "../../api/transport";
import type {BootstrapData} from "../../bootstrap";
import {useToasts} from "../../components/toasts/toasts";
import {navigateToApplication} from "./navigation";
import {type FormCredentials, loginWithForm} from "./session";

type LoginPageProps = {
    bootstrap: BootstrapData;
    transport: ApiTransport;
    /** Test seam for the full document navigation jsdom cannot perform. */
    navigate?: (baseUrl: string, path?: string) => void;
};

/**
 * Legacy's `login.html` + `login-controller.js`: the FORM authentication login
 * page. The two placeholder-only inputs become labelled MUI fields
 * (ADR-0014), and legacy's `$state.go("root.search")` becomes a full document
 * navigation to the application base URL, because the new session's route tree
 * and navigation are built from the server-rendered bootstrap (see
 * `navigation.ts`).
 */
export function LoginPage({
    bootstrap,
    transport,
    navigate = navigateToApplication,
}: LoginPageProps) {
    const toasts = useToasts();
    const {formState, handleSubmit, register, watch} = useForm<FormCredentials>(
        {defaultValues: {username: "", password: ""}},
    );
    const [username, password] = watch(["username", "password"]);
    const incomplete = username.trim() === "" || password === "";

    const submit = handleSubmit(async (credentials) => {
        try {
            await loginWithForm(transport, credentials);
        } catch {
            toasts.showToast({message: "Login failed!", severity: "error"});
            return;
        }
        toasts.showToast({message: "Login successful!", severity: "info"});
        navigate(bootstrap.baseUrl);
    });

    return (
        <Stack
            sx={{
                alignItems: "center",
                py: 6,
            }}
        >
            <Paper sx={{maxWidth: 420, p: 3, width: "100%"}}>
                <Box component="form" noValidate onSubmit={submit}>
                    <Stack spacing={2}>
                        <Typography
                            component="h1"
                            variant="h5"
                            sx={{
                                textAlign: "center",
                            }}
                        >
                            Log in
                        </Typography>
                        <TextField
                            autoComplete="username"
                            autoFocus
                            fullWidth
                            label="Username"
                            slotProps={{
                                htmlInput: {"data-testid": "login-username"},
                            }}
                            {...register("username")}
                        />
                        <TextField
                            autoComplete="current-password"
                            fullWidth
                            label="Password"
                            slotProps={{
                                htmlInput: {"data-testid": "login-password"},
                            }}
                            type="password"
                            {...register("password")}
                        />
                        <Button
                            data-testid="login-submit"
                            disabled={incomplete || formState.isSubmitting}
                            fullWidth
                            type="submit"
                            variant="contained"
                        >
                            Log in
                        </Button>
                        <Typography
                            variant="body2"
                            sx={{
                                color: "text.secondary",
                            }}
                        >
                            You will be forwarded to the search area.
                        </Typography>
                    </Stack>
                </Box>
            </Paper>
        </Stack>
    );
}
