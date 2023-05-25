![PassViz Logo](https://github.com/GlebKazantaev/pass-viz/blob/master/pass_viz/react-app/header.png)

--------------------------------------------------------------------------------

PassViz is a web tool designed specifically for graphs visualization. Its primary purpose is to assist DL
(Deep Learning) compiler developers in visualizing the flow of graph transformations. The PassViz provides
a user-friendly interface for rendering and analyzing graphs used in DL compiler development. By visualizing
the graph transformation flow, developers can gain insights into the optimizations and transformations performed
on the graph during the compilation process.

## Goals
PassViz can help developers to answer next questions:
* How has the transformation pipeline changed after I added a new pass?
* How many times transformation was applied and which nodes were changed?
* How do dynamic shapes affect transformation execution?
* How do different graph traversal algorithms affect transformation execution?

and much more.

## Key Concepts
### Pass Tracking & Hierarchy
PassViz is designed to consume graph files (dumps) provided by some backend (compiler pipeline) in specific JSON format.
These files should contain sub-graphs that describe particular graph change/transformation. For example:
<img width="464" alt="image" src="https://github.com/GlebKazantaev/pass-viz/assets/18436845/05bd5a11-db56-48e8-9761-6b00a9ace4be">

<!-- toc -->

this sub-graph produced by runtime shows how BatchNorm operation was decomposed into sub-graph (green nodes) and old nodes were
removed (yellow nodes). The granularity of produced sub-graphs and its content will be discussed later. Just another example of 
constant folding transformation which produces more complex sub-graph with multiple connected components:

<img width="742" alt="image" src="https://github.com/GlebKazantaev/pass-viz/assets/18436845/a8e598ad-88de-4704-a0ab-24b3639d6660">

<!-- toc -->

So, as you might guessed, the main purpose of PassViz is to visualize these graph files produced by some backend, so developers can easily
check wich passes were applied to the graph and how graph was changed by transformations. Unfortunately all burden for producing these dump files
remains on compiler infrastructure (not PassViz). As a POC I've implemented pass tracker based on OpenVINO infrastructure that shows that tracing is
possible and can be efficient. See [getting started guide](#getting-started)

Each dimp file contains not only sub-graphs but also the transformation name, model name and run name which are used by PassViz to construct an hierarchy
of these files. This hierarchy includes several levels:
```
run name --> model name --> pass name --> sub-graphs ids --> graphs
```
So, let's go through each level:
* **run name** - top level key represents a group of models compiled in some way. Useful when we have the same models compiled with different parameters (dynamic shapes and static shapes for example).
* **model name** - contains a bunch of passes that were applied during model compilation.
* **pass name** - contains a set of subgraphs that describe graph changes within a single pass. Depending on the transformation type the number of sub-graphs can be different. For example, if we track 
a single function pass, so we will probably get the only sub-graph (depends on how backend implements pass tracking). Or if we have a MatcherPass which is usually applied more than once to a graph, 
so we will get more than one sub-graph.
* **graphs** - this is the last key in the hierarchy, which divides a single graph change to several levels. As a reference I divided one graph transformation to three sub-graphs:
  * created - contains only nodes that were added by transformation.
  * eliminated - contains only nodes that were removed by transformation.
  * combined - combines created and eliminated sub-graphs.
 
These categories on `graph` level are not limited by these three and can be defined by each compiler backend independently.
For better understanding please go to the `Give Me An Example!` section, so you can try to run pass viz with some test data.

### Nodes Context
The last thing I wanted to discuss in the key concepts section is sub-graph context (not colored nodes). If you take a look at sub-graph picture above you may notice that some nodes are
colored (green and yellow) but some are not. So, these nodes stay the same during transformation and form the context around changed nodes which is sometimes critical to have 
to understand the context around transformed noded. For example, imagine case when we replaced one node with another and node names were autogenerated, so it is impossible
to understand in which part of the graph we did this change. But with node context this will be trivial.

## Key Features
On the main PassViz page you can find several options, so here the short description:
1. **Visualize Pass By Model.** As we discussed in the previous section, PassViz can visualize graphs dumped by the compiler in a convenient way. In addition to that I wanted to 
add that all nodes in graph visualizer a **clickable** so you can check nodes attributes (if your backend produced them).
2. **Compare Passes Execution.** Compares two runs and shows the difference between transformation execution pipelines. Comparison of sub-graphs is based on graphs isomorphism (from networkX). But there 
are also some optimizations that help to match sub-graph more efficiently and more accurately considering node names. And to be honest, there are a lot of nuances when it comes to sub-graphs comparison especially when number of 
sub-graphs are different... and all this logic with maximum bipartite matching deserves a dedicated article, but the idea is that it should work smoothly and you shouldn't care about implementation details.

## Getting Started
To run PassViz, follow these steps:
1. Create python virtual environment:
```
python -m venv pass_viz_venv && source ./pass_viz_venv/bin/activate
```
2. Install pass_viz wheel file:
```
pip install https://github.com/GlebKazantaev/pass-viz/releases/download/v1.0.0/pass_viz-1.0.0-py3-none-any.whl
```
4. Install docker engine (see https://docs.docker.com/desktop/ for more details).
5. Pull docker image:
```
docker pull gkazanta/pass-viz:1.0.0
```
6. Run python and start pass_viz backend:
```
>>> from pass_viz.backend import run
>>> run(dump_dir="./test_dump") # ./test_dump is a directory where dump files were saved. If you just want to check pass_viz in action, you can keep it as is.
```
7. Open **Chrome** (other browsers are not tested) and go to `http://localhost:3000/`

## Run From Sources
To run PassViz from source, follow these steps:
1. Clone PassViz repository:
```
git clone https://github.com/GlebKazantaev/pass-viz.git
cd ./pass_viz
```
2. Create virtual env and install requirements:
```
python -m venv pass_viz_venv && source ./pass_viz_venv/bin/activate
pip install -r requirements.txt
```
3. Install nodejs.
4. Install npm packages and start development server:
```
cd ./pass_viz/react-app
npm install && npm start
```
5. Go back to root repo directory and start backend using python:
```
>>> from pass_viz.backend import run
>>> run(dump_dir="./test_dump", run_frontend=False)
```

## Contributing
Contributions to the PassViz are welcome! If you encounter any issues or have suggestions for new features, please submit them via the GitHub issue tracker. 
Feel free to fork the repository, make improvements, and submit pull requests as well.
