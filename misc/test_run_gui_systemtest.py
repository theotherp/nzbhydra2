import argparse
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, call, patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import run_gui_systemtest as runner


class ChooseRuntimeTest(unittest.TestCase):

    def test_should_attach_when_both_services_are_healthy(self):
        self.assertEqual("existing", runner.choose_runtime("auto", True, True))

    def test_should_start_local_services_when_neither_service_is_healthy(self):
        self.assertEqual("local", runner.choose_runtime("auto", False, False))

    def test_should_reject_partially_running_services(self):
        with self.assertRaisesRegex(RuntimeError, "Only Hydra is healthy"):
            runner.choose_runtime("auto", True, False)

    def test_should_honor_explicit_local_runtime(self):
        self.assertEqual("local", runner.choose_runtime("local", True, True))


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
        self.assertEqual(6, run_command.call_count)
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
    @patch.object(runner, "run_command", return_value=0)
    def test_should_configure_host_process_urls(self, run_command, find_command):

        exit_code = runner.run_playwright(
            "http://windows-host:5076",
            "http://windows-host:5080",
            ["--", "tests/smoke.spec.ts"],
            300,
        )

        self.assertEqual(0, exit_code)
        command = run_command.call_args.args[0]
        environment = run_command.call_args.kwargs["environment"]
        self.assertEqual(["npx", "playwright", "test", "tests/smoke.spec.ts"], command)
        self.assertEqual("http://windows-host:5076", environment["PLAYWRIGHT_BASE_URL"])
        self.assertEqual("http://windows-host:5080", environment["MOCKSERVER_EXTERNAL_URL"])
        self.assertEqual("http://127.0.0.1:5080", environment["MOCKSERVER_INTERNAL_URL"])
        self.assertEqual("http://127.0.0.1:18989", environment["SONARR_INTERNAL_URL"])


class RunnerSafetyTest(unittest.TestCase):

    @patch.object(runner.fcntl, "flock", side_effect=OSError("locked"))
    def test_should_reject_lock_contention(self, flock):
        with tempfile.TemporaryDirectory() as temporary_directory:
            with patch.object(runner, "RUNS_DIR", Path(temporary_directory)):
                with self.assertRaisesRegex(RuntimeError, "already active"):
                    runner.acquire_run_lock()

    @patch.object(runner.os, "killpg")
    def test_should_kill_process_group_after_timeout(self, killpg):
        process = MagicMock()
        process.poll.return_value = None
        process.pid = 123
        process.wait.side_effect = [runner.subprocess.TimeoutExpired("playwright", 1), None]

        runner.terminate_process_group(process, grace_period=1)

        self.assertEqual(
            [call(123, runner.signal.SIGTERM), call(123, runner.signal.SIGKILL)],
            killpg.call_args_list,
        )

    @patch.object(runner, "terminate_process_group")
    @patch.object(runner.subprocess, "Popen")
    def test_should_bound_setup_command_timeout(self, popen, terminate_process_group):
        process = MagicMock()
        process.wait.side_effect = runner.subprocess.TimeoutExpired("docker", 1)
        popen.return_value = process

        self.assertEqual(124, runner.run_command(["docker"], timeout=1))
        terminate_process_group.assert_called_once_with(process)

    @patch.object(runner.time, "sleep")
    @patch("run_gui_systemtest.socket.socket")
    def test_should_fail_when_shutdown_port_is_not_released(self, socket_factory, sleep):
        probe = MagicMock()
        probe.__enter__.return_value = probe
        probe.connect_ex.return_value = 0
        socket_factory.return_value = probe
        monotonic = iter([0, 0, 1])
        with patch.object(runner.time, "monotonic", side_effect=monotonic):
            with self.assertRaisesRegex(RuntimeError, "remained in use"):
                runner.wait_for_port_release(5080, timeout=1)

    @patch.object(runner, "run_command", return_value=1)
    @patch.object(runner, "compose_command", return_value=["docker", "compose"])
    def test_should_fail_when_docker_cleanup_fails(self, compose_command, run_command):
        with self.assertRaisesRegex(RuntimeError, "Unable to stop"):
            runner.stop_supporting_services(["sonarr"])

    def test_should_reset_arr_data_except_configuration(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            data_dir = Path(temporary_directory) / "sonarr" / "data"
            data_dir.mkdir(parents=True)
            (data_dir / "config.xml").write_text("configuration", encoding="utf-8")
            (data_dir / "old.db").write_text("stale", encoding="utf-8")
            (data_dir / "MediaCover").mkdir()

            with patch.object(runner, "COMPOSE_FILE", Path(temporary_directory) / "linux" / "docker-compose.yaml"):
                runner.reset_arr_data("sonarr")

            self.assertTrue((data_dir / "config.xml").is_file())
            self.assertFalse((data_dir / "old.db").exists())
            self.assertFalse((data_dir / "MediaCover").exists())


class LocalBaselineTest(unittest.TestCase):

    @patch.object(runner.urllib.request, "urlopen")
    def test_should_add_api_enabled_mock_indexer(self, urlopen):
        config_response = MagicMock()
        config_response.read.return_value = b'{"indexers": []}'
        config_response.__enter__.return_value = config_response
        update_response = MagicMock()
        update_response.read.return_value = b'{"ok": true}'
        update_response.__enter__.return_value = update_response
        urlopen.side_effect = [config_response, update_response]

        runner.configure_local_baseline()

        update_request = urlopen.call_args_list[1].args[0]
        updated_config = json.loads(update_request.data.decode("utf-8"))
        self.assertEqual("BOTH", updated_config["indexers"][0]["enabledForSearchSource"])
        self.assertEqual("ENABLED", updated_config["indexers"][0]["state"])


if __name__ == "__main__":
    unittest.main()
