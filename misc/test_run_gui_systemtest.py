import argparse
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import run_gui_systemtest as runner


class ChooseRuntimeTest(unittest.TestCase):

    def test_should_attach_when_both_services_are_healthy(self):
        self.assertEqual("existing", runner.choose_runtime("auto", True, True))

    def test_should_start_wsl_services_when_neither_service_is_healthy(self):
        self.assertEqual("wsl", runner.choose_runtime("auto", False, False))

    def test_should_reject_partially_running_services(self):
        with self.assertRaisesRegex(RuntimeError, "Only Hydra is healthy"):
            runner.choose_runtime("auto", True, False)

    def test_should_honor_explicit_wsl_runtime(self):
        self.assertEqual("wsl", runner.choose_runtime("wsl", True, True))


class SupportingServicesTest(unittest.TestCase):

    @patch.object(runner, "wait_for_url")
    @patch.object(runner, "run_command", return_value=0)
    @patch.object(runner, "compose_command", return_value=["docker", "compose"])
    @patch.object(runner, "ensure_systemtest_network")
    def test_should_recreate_supporting_services(
            self,
            ensure_network,
            compose_command,
            run_command,
            wait_for_url,
    ):
        started = runner.start_supporting_services(30)

        self.assertEqual(["sonarr", "radarr"], started)
        ensure_network.assert_called_once_with()
        self.assertEqual(2, run_command.call_count)
        self.assertEqual(2, wait_for_url.call_count)


class ExistingRuntimeTest(unittest.TestCase):

    @patch.object(runner, "stop_process")
    @patch.object(runner, "stop_supporting_services")
    @patch.object(runner, "run_playwright", return_value=0)
    @patch.object(runner, "start_supporting_services", return_value=[])
    @patch.object(
        runner,
        "discover_existing_urls",
        return_value=("http://127.0.0.1:5076", "http://127.0.0.1:5080"),
    )
    def test_should_not_stop_attached_processes(
            self,
            discover_existing_urls,
            start_supporting_services,
            run_playwright,
            stop_supporting_services,
            stop_process,
    ):
        with tempfile.TemporaryDirectory() as temporary_directory:
            args = argparse.Namespace(
                runtime="auto",
                core_url=None,
                mockserver_url=None,
                startup_timeout=30,
                test_timeout=300,
                skip_install=True,
                keep_services=False,
                playwright_args=[],
            )
            with patch.object(runner, "RUNS_DIR", Path(temporary_directory)):
                self.assertEqual(0, runner.run(args))

        stop_process.assert_not_called()
        stop_supporting_services.assert_called_once_with([])


class PlaywrightEnvironmentTest(unittest.TestCase):

    @patch.object(runner, "find_command", return_value="npx")
    @patch.object(runner.subprocess, "run")
    def test_should_configure_host_process_urls(self, subprocess_run, find_command):
        subprocess_run.return_value.returncode = 0

        exit_code = runner.run_playwright(
            "http://windows-host:5076",
            "http://windows-host:5080",
            ["--", "tests/smoke.spec.ts"],
            300,
        )

        self.assertEqual(0, exit_code)
        command = subprocess_run.call_args.args[0]
        environment = subprocess_run.call_args.kwargs["env"]
        self.assertEqual(["npx", "playwright", "test", "tests/smoke.spec.ts"], command)
        self.assertEqual("http://windows-host:5076", environment["PLAYWRIGHT_BASE_URL"])
        self.assertEqual("http://windows-host:5080", environment["MOCKSERVER_EXTERNAL_URL"])
        self.assertEqual("http://127.0.0.1:5080", environment["MOCKSERVER_INTERNAL_URL"])


class WslBaselineTest(unittest.TestCase):

    @patch.object(runner.urllib.request, "urlopen")
    def test_should_add_api_enabled_mock_indexer(self, urlopen):
        config_response = MagicMock()
        config_response.read.return_value = b'{"indexers": []}'
        config_response.__enter__.return_value = config_response
        update_response = MagicMock()
        update_response.read.return_value = b'{"ok": true}'
        update_response.__enter__.return_value = update_response
        urlopen.side_effect = [config_response, update_response]

        runner.configure_wsl_baseline()

        update_request = urlopen.call_args_list[1].args[0]
        updated_config = json.loads(update_request.data.decode("utf-8"))
        self.assertEqual("BOTH", updated_config["indexers"][0]["enabledForSearchSource"])
        self.assertEqual("ENABLED", updated_config["indexers"][0]["state"])


if __name__ == "__main__":
    unittest.main()
