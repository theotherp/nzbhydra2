import argparse
import io
import json
import sys
import tempfile
import threading
import time
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
                java_phase=False,
                java_test=None,
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


def managed_core(process, log_file=None):
    managed = runner.ManagedProcess(
        "Hydra JVM core",
        process,
        Path("core.log"),
        log_file if log_file is not None else MagicMock(),
        f"http://127.0.0.1:{runner.CORE_PORT}/actuator/shutdown",
    )
    managed.command = ["java", "-jar", "core.jar"]
    managed.cwd = Path("/repository")
    managed.environment = {"spring_profiles_active": "build,systemtest,core"}
    managed.start_new_session = True
    return managed


def wait_for(condition, timeout=5):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if condition():
            return True
        time.sleep(0.01)
    return False


class SupervisorDecisionTest(unittest.TestCase):

    def test_should_relaunch_after_a_restart_exit(self):
        self.assertEqual("restart", runner.supervisor_decision(22, stopping=False))

    def test_should_restore_before_relaunching_after_a_restore_exit(self):
        self.assertEqual("restore", runner.supervisor_decision(33, stopping=False))

    def test_should_fail_the_run_for_any_other_exit(self):
        self.assertEqual("fail", runner.supervisor_decision(1, stopping=False))
        self.assertEqual("fail", runner.supervisor_decision(0, stopping=False))

    def test_should_accept_every_exit_once_teardown_asked_for_it(self):
        for return_code in (0, 1, 22, 33):
            self.assertEqual("stop", runner.supervisor_decision(return_code, stopping=True))


class CoreSupervisionTest(unittest.TestCase):

    def make_blocking_process(self, pid, release):
        process = MagicMock()
        process.pid = pid
        process.wait.side_effect = lambda *arguments, **keywords: (release.wait(5), 0)[1]
        return process

    def test_should_relaunch_with_the_identical_command_after_exit_22(self):
        release = threading.Event()
        first = MagicMock(pid=1)
        first.wait.return_value = 22
        second = self.make_blocking_process(2, release)
        managed = managed_core(first)

        with patch.object(runner.subprocess, "Popen", return_value=second) as popen:
            runner.supervise_restartable_core(managed, Path("/data"))
            self.assertTrue(wait_for(lambda: managed.process is second))
            managed.stop_supervisor.set()
            release.set()
            managed.supervisor.join(5)

        popen.assert_called_once_with(
            managed.command,
            cwd=managed.cwd,
            env=managed.environment,
            stdout=managed.log_file,
            stderr=runner.subprocess.STDOUT,
            start_new_session=True,
        )
        self.assertEqual([22], managed.restart_exit_codes)
        self.assertEqual([], managed.restore_restart_exit_codes)
        self.assertIsNone(managed.unexpected_exit_code)

    def test_should_apply_restored_files_before_relaunching_after_exit_33(self):
        release = threading.Event()
        first = MagicMock(pid=1)
        first.wait.return_value = 33
        second = self.make_blocking_process(2, release)
        managed = managed_core(first)

        with tempfile.TemporaryDirectory() as temporary_directory:
            data_dir = Path(temporary_directory)
            (data_dir / "restore").mkdir()
            (data_dir / "restore" / "nzbhydra.mv.db").write_text("database", encoding="utf-8")
            (data_dir / "restore" / "nzbhydra.yml").write_text("config", encoding="utf-8")

            with patch.object(runner.subprocess, "Popen", return_value=second):
                runner.supervise_restartable_core(managed, data_dir)
                self.assertTrue(wait_for(lambda: managed.process is second))
                managed.stop_supervisor.set()
                release.set()
                managed.supervisor.join(5)

            self.assertEqual(
                "database",
                (data_dir / "database" / "nzbhydra.mv.db").read_text(encoding="utf-8"),
            )
            self.assertEqual("config", (data_dir / "nzbhydra.yml").read_text(encoding="utf-8"))
            self.assertFalse((data_dir / "restore").exists())

        self.assertEqual([33], managed.restart_exit_codes)
        self.assertEqual([33], managed.restore_restart_exit_codes)

    def test_should_end_supervision_loudly_on_an_unexpected_exit(self):
        process = MagicMock(pid=1)
        process.wait.return_value = 1
        managed = managed_core(process)

        with patch.object(runner.subprocess, "Popen") as popen:
            runner.supervise_restartable_core(managed, Path("/data"))
            managed.supervisor.join(5)

        popen.assert_not_called()
        self.assertEqual(1, managed.unexpected_exit_code)
        self.assertEqual([], managed.restart_exit_codes)
        self.assertEqual(1, runner.report_core_restarts([managed], 0))

    def test_should_not_relaunch_an_exit_teardown_asked_for(self):
        process = MagicMock(pid=1)
        managed = managed_core(process)
        released = threading.Event()

        def wait_until_teardown(*arguments, **keywords):
            released.wait(5)
            return 22

        process.wait.side_effect = wait_until_teardown

        with patch.object(runner.subprocess, "Popen") as popen:
            runner.supervise_restartable_core(managed, Path("/data"))
            managed.stop_supervisor.set()
            released.set()
            managed.supervisor.join(5)

        popen.assert_not_called()
        self.assertIs(process, managed.process)
        self.assertIsNone(managed.unexpected_exit_code)

    def test_should_report_a_clean_run_without_failing_it(self):
        managed = managed_core(MagicMock())
        managed.stop_supervisor = threading.Event()
        managed.restart_exit_codes = [22]
        managed.restore_restart_exit_codes = []

        self.assertEqual(0, runner.report_core_restarts([managed], 0))


class SupervisedTeardownTest(unittest.TestCase):

    @patch.object(runner, "post_shutdown")
    def test_should_shut_down_the_process_a_racing_relaunch_left_behind(self, post_shutdown):
        dead = MagicMock(pid=1)
        dead.poll.return_value = 0
        relaunched = MagicMock(pid=2)
        relaunched.poll.return_value = None
        managed = managed_core(dead)
        managed.stop_supervisor = threading.Event()
        supervisor = MagicMock()

        def relaunch_during_join(timeout=None):
            managed.process = relaunched

        supervisor.join.side_effect = relaunch_during_join
        managed.supervisor = supervisor

        runner.stop_process(managed)

        self.assertTrue(managed.stop_supervisor.is_set())
        post_shutdown.assert_called_once_with(managed.shutdown_url)
        relaunched.wait.assert_called_once_with(timeout=10)
        dead.wait.assert_not_called()


class JavaPhaseTest(unittest.TestCase):

    @patch.object(runner, "find_command", return_value="mvn")
    @patch.object(runner, "run_command", return_value=0)
    def test_should_point_folder_properties_at_this_runs_local_folders(
            self, run_command, find_command
    ):
        exit_code = runner.run_java_system_tests(
            "http://127.0.0.1:5076",
            "http://127.0.0.1:5080",
            600,
            Path("/runs/1/data"),
            Path("/runs/1/blackhole"),
            "AuthorizationSystemTest",
        )

        self.assertEqual(0, exit_code)
        command = run_command.call_args.args[0]
        environment = run_command.call_args.kwargs["environment"]
        self.assertIn("-DskipTests=false", command)
        self.assertIn("-Dnzbhydra.name=core", command)
        self.assertIn("-DdataFolder.testaccess=/runs/1/data", command)
        self.assertIn("-DblackholeFolder.nzbhydra=/runs/1/blackhole", command)
        self.assertIn("-DblackholeFolder.testaccess=/runs/1/blackhole", command)
        self.assertIn("-Dnzbhydra.host.external=http://host.docker.internal:5076", command)
        self.assertIn("-Dsonarr.host=http://127.0.0.1:18989", command)
        self.assertIn("-Dradarr.host=http://127.0.0.1:7878", command)
        self.assertIn("-Dtest=AuthorizationSystemTest", command)
        self.assertEqual("systemtest,testdocker", environment["spring_profiles_active"])
        self.assertEqual(runner.PROJECT_ROOT, run_command.call_args.kwargs["cwd"])

    @patch.object(runner, "find_command", return_value="mvn")
    @patch.object(runner, "run_command", return_value=0)
    def test_should_omit_local_folder_properties_without_a_local_run(
            self, run_command, find_command
    ):
        runner.run_java_system_tests("http://127.0.0.1:5076", "http://127.0.0.1:5080", 600)

        command = run_command.call_args.args[0]
        self.assertFalse([item for item in command if item.startswith("-DdataFolder")])
        self.assertFalse([item for item in command if item.startswith("-DblackholeFolder")])
        self.assertFalse([item for item in command if item.startswith("-Dnzbhydra.host.external")])
        self.assertFalse([item for item in command if item.startswith("-Dtest=")])

    @patch.object(runner, "stop_process")
    @patch.object(runner, "stop_supporting_services")
    @patch.object(runner, "run_playwright", return_value=0)
    @patch.object(runner, "run_java_system_tests", return_value=0)
    @patch.object(runner, "start_supporting_services", return_value=[])
    @patch.object(
        runner,
        "discover_existing_urls",
        return_value=("http://127.0.0.1:5076", "http://127.0.0.1:5080"),
    )
    def test_should_warn_that_an_attached_instance_is_unsupervised(
            self,
            discover_existing_urls,
            start_supporting_services,
            run_java_system_tests,
            run_playwright,
            stop_supporting_services,
            stop_process,
    ):
        with tempfile.TemporaryDirectory() as temporary_directory:
            args = argparse.Namespace(
                runtime="existing",
                core_url=None,
                mockserver_url=None,
                startup_timeout=30,
                test_timeout=300,
                skip_install=True,
                keep_services=False,
                java_phase=True,
                java_test=None,
                playwright_args=[],
            )
            with patch.object(runner, "RUNS_DIR", Path(temporary_directory)):
                with patch("sys.stderr", new=io.StringIO()) as captured:
                    self.assertEqual(0, runner.run(args))

        self.assertIn("unsupervised", captured.getvalue())
        self.assertEqual(
            (None, None), run_java_system_tests.call_args.args[3:5]
        )


if __name__ == "__main__":
    unittest.main()
