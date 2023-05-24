import subprocess
import psutil
import docker
import os
import sys


class SetupBackend:
    def __init__(self, dump_dir, run_backend, run_frontend):
        self.run_backend = run_backend
        self.run_frontend = run_frontend

        # Run react-app
        self.client = docker.from_env()
        self.image_name = "gkazanta/pass-viz:1.0.0"

        if self.run_frontend:
            try:
                self.client.images.get(self.image_name)
            except Exception as e:
                print(f"ERROR: Make sure that {self.image_name} is loaded.\n{e}")
                exit(-1)

            self.image = subprocess.Popen(["docker", "run", "--rm", "-p", "3000:3000", self.image_name])

            # TODO: for some reason python docker run doesn't start npm server.
            # self.image = self.client.containers.run("pass-viz:prod", detach=True, publish_all_ports=True, remove=True)

        if self.run_backend:
            # Run backend
            self.backend = subprocess.Popen([
                sys.executable, f"{__path__[0]}/app.py", "--dump_dir", dump_dir
            ])

    def kill(self, proc_pid):
        process = psutil.Process(proc_pid)
        for proc in process.children(recursive=True):
            proc.kill()
        process.kill()

    def communicate(self):
        while True:
            cmd = input("pass_viz:shell$ ")
            if len(cmd) == 0:
                continue

            if cmd == "kill":
                print(f"killing process")
                return
            else:
                print(f"unsupported: {cmd}")

    def __enter__(self):
        self.communicate()

    def __exit__(self, type, value, traceback):
        if self.run_backend:
            self.kill(self.backend.pid)

        if self.run_frontend:
            self.kill(self.image.pid)


DEFAULT_DUMP_DIR = "/tmp/pass_viz"


def run(dump_dir=DEFAULT_DUMP_DIR, run_backend=True, run_frontend=True):
    if dump_dir == DEFAULT_DUMP_DIR and not os.path.exists(dump_dir):
        try:
            os.makedirs(dump_dir)
        except OSError:
            print(f"ERROR: can not create default dump dir at: {dump_dir}")
            exit(-1)
    with SetupBackend(dump_dir=dump_dir, run_backend=run_backend, run_frontend=run_frontend):
        pass
