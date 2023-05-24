from setuptools import setup, find_packages

setup(
    name="pass-viz",
    description="PassViz - DL Graphs Profiler",
    version="1.0.0",
    author="Gleb Kazantaev",
    license="License :: Apache Software License",
    packages=find_packages() + ['pass_viz', "pass_viz.backend"],
    install_requires=[
        "psutil==5.9.5",
        "docker==5.0.3",
        "Flask==2.0.3",
        "Flask-Cors==3.0.10",
        "networkx==2.5.1",
    ],
)
