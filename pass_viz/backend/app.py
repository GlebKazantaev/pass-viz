from flask import Flask, jsonify, request
from flask_cors import CORS

import networkx as nx
import argparse
import glob
import logging

from dataclasses import dataclass, asdict

from utils import nested_dict


app = Flask(__name__)
CORS(app)

# passes dictionary stores the state of loaded dumps.
# The structure of this dict should be verified buy PASS_REQUEST_SCHEMA list.

PASS_REQUEST_SCHEMA = [
    "selectedRun", "selectedModel", "selectedPass", "selectedGraph", "graphType"
]

passes = nested_dict()

# cmp_passes dictionary stores the state of runs comparisons.
# The structure of this dict should be verified buy PASS_REQUEST_SCHEMA list.

CMP_PASS_REQUEST_SCHEMA = [
    "selectedRunRef", "selectedRunTarget", "selectedModel", "selectedPass", "selectedGraph"
]

cmp_passes = nested_dict()

# Directory with JSON dump files.
JSON_DUMP_DIR = ""

json_md5 = {}


def load_json_dump(path_to_json: str):
    # TODO: load only missing or different files

    import hashlib
    hash = hashlib.md5(open(path_to_json, 'rb').read()).hexdigest()

    existing_json=False
    if path_to_json in json_md5:
        existing_json=True
        if json_md5[path_to_json] == hash:
            return

    logging.info(f"Loading JSON: {path_to_json}")

    json_md5[path_to_json] = hash

    import json
    f = open(path_to_json)
    data = json.load(f)

    g = nx.DiGraph()

    dot = "digraph \"{}\" {{\n".format(data['pass_name'])

    dot += "node [shape=box style=rounded]\n"
    dot += "edge [fontsize=10 color=gra40 fontcolor=gra40]\n"

    context_nodes = set()

    for unique_node_name, props in data['nodes'].items():
        dot += "\"" + unique_node_name + "\""
        attrs = " ".join(["{}={} ".format(a, b) for a, b in props['dot_attrs'].items()])
        dot += " [label={} {}]".format(props['attrs']['type'], attrs)
        dot += '\n'

        # TODO: make backend produce context_node attribute with its depth. Currently we consider all nodes without
        #       colour attribute as a context nodes.
        if 'color' in props['dot_attrs']:
            g.add_nodes_from([(unique_node_name, props['attrs'])])
        else:
            context_nodes.add(unique_node_name)

    for a, b in data['edges'].items():
        for to in b:
            dot += "\"" + a + "\"" + "->" + "\"" + to + "\"" + "\n"

            if a in context_nodes or to in context_nodes:
                continue

            g.add_edge(a, to)

    dot += "}"

    run_name, model_name, pass_name, graph_index, get_graph_types = \
        data['run_name'], data['model_name'], data['pass_name'], data['index'], data['type']

    # if run_name in passes:
    #     del passes[run_name]

    # TODO: remove cmp cache.

    passes[run_name][model_name][pass_name][graph_index][data['type']]['dot'] = dot
    passes[run_name][model_name][pass_name][graph_index][data['type']]['nx'] = g
    passes[run_name][model_name][pass_name][graph_index][data['type']]['nodes'] = data['nodes']


def reload_json_files():
    """
    Reload JSON files stored in JSON_DUMP_DIR directory.

    :return: None
    """
    for path in glob.glob(f'{JSON_DUMP_DIR}/*.json'):
        load_json_dump(path)


def parse_pass_request(last_key=None):
    """
    Returns passes state based on request args.

    :param last_key: last key in request args sequence.
    :return: passes state.
    """
    state = passes
    for idx, item in enumerate(request.args.items()):
        k, v = item

        assert k == PASS_REQUEST_SCHEMA[idx]

        if v not in state:
            return None

        state = state[v]

        if last_key and k == last_key:
            break

    return state


def parse_cmp_pass_request(last_key=None):
    """
    Returns cmp_passes state based on request args.

    :param last_key: last key in request args sequence.
    :return: passes state.
    """
    state = cmp_passes
    for idx, item in enumerate(request.args.items()):
        k, v = item

        assert k == CMP_PASS_REQUEST_SCHEMA[idx]

        if v not in state:
            return None

        state = state[v]

        if last_key and k == last_key:
            break

    return state


# -----------------------------------------------------------
# Pass visualizer routes processing.
# -----------------------------------------------------------

@app.route('/availableRuns')
def get_available_runs():
    reload_json_files()
    return jsonify({
        "runs": [{'value': x, 'label': x} for x in passes.keys()]
    })


@app.route('/models')
def get_models():
    state = parse_pass_request()

    return jsonify({
        "models": {x: {} for x in state.keys()}
    })


@app.route('/passes')
def get_passes():
    state = parse_pass_request()

    return jsonify({
        "passes": {x: {'count': len(state[x].keys())} for x in state.keys()},
    })


@app.route('/graphs')
def get_graphs():
    state = parse_pass_request()

    return jsonify({
        "graphs": {x: {} for x in state.keys()}
    })


@app.route('/graphTypes')
def get_graph_types():
    state = parse_pass_request()

    return jsonify({
        "types": {x: {} for x in state.keys()}
    })


@app.route('/graph')
def get_graph():
    state = parse_pass_request()

    if state is None:
        return jsonify({
           "graph": "digraph G { end [shape=Square label=\"Graph Is Missing\"];}"
        })

    return jsonify({
        "graph": state['dot']
    })


@app.route('/attrs')
def get_node_attrs():
    node_name = request.args.get('nodeName')

    state = parse_pass_request(last_key="graphType")

    if state is None or node_name not in state["nodes"]:
        return jsonify({'name': "None", 'type': "None"})

    return jsonify({
        "attrs": state['nodes'][node_name]['attrs']
    })


@app.route('/nodes')
def get_nodes():
    state = parse_pass_request()

    if state is None:
        return jsonify({"nodes": []})

    nodes = state['nodes']

    return jsonify({
        "nodes": [{'value': x, 'label': nodes[x]['attrs']['name']} for x in nodes.keys()]
    })


@app.route('/remove')
def remove_run():
    selected_run = request.args.get('selectedRun')
    del passes[selected_run]
    return jsonify({})


# -----------------------------------------------------------
# Compare passes routes processing.
# -----------------------------------------------------------

@dataclass
class ModelProps:
    """Stores model properties state."""
    is_new: bool = False
    is_missing: bool = False
    has_diff: bool = False


@dataclass
class PassProps:
    """Stores pass properties state."""
    is_new: bool = False
    is_missing: bool = False
    has_diff: bool = False
    ref_cnt: int = None
    target_cnt: int = None
    diff_cnt: int = None


@dataclass
class GraphIndexProps:
    """Stores pass properties state."""
    is_new: bool = False
    is_missing: bool = False
    has_diff: bool = False
    ref_index: str = None
    target_index: str = None


@dataclass
class CompareProps:
    """Stores comparison properties state."""
    is_new: bool = False
    is_missing: bool = False
    has_diff: bool = False
    cmp_log: str = ""


def compare_nodes(a, b):
    if 'type' in a and 'type' in b:
        return a['type'] == b['type']

    return True


def compare_nx_graphs_by_topology(a, b):
    if not nx.faster_could_be_isomorphic(a, b):
        return False, ""
    return nx.is_isomorphic(a, b, compare_nodes), ""


def compare_nx_graphs_by_names(a, b):
    s = set.intersection(
        set([attrs['name'] for name, attrs in a.nodes.items()]),
        set([attrs['name'] for name, attrs in b.nodes.items()])
    )
    return len(s) > 0, ""


def smart_pass_lists_comparison(cmp_pass, ref_list, target_list, compare_by_names=True):
    match = nested_dict()

    # Comparison algorithm:
    # 1. Iterate over all ref graphs and match with any target graphs.
    #    Result will be stored in match dict where key is ref_pass_index
    #    and value is a list of target_pass_indexes that was successfully matched.
    # 2. For cases when graph of passes still not bipartite, we run 
    #    kun algorithm to remove excess match connections between passes
    #    and make graph bipartite.

    for ref_index, ref_graphs in ref_list.items():
        for target_index, target_graphs in target_list.items():
            # TODO: relax this statement
            # Skip comparison if number of graph types or their names are different
            if set(ref_graphs.keys()) != set(target_graphs.keys()):
                logging.debug('skip: {} {} because {} != {}'.format(ref_index, target_index, set(ref_graphs.keys()), set(target_graphs.keys())))
                continue



            for graph_type in ref_graphs:
                logging.debug(f"debug: cmp {ref_index} vs {target_index} with type {graph_type}")

                t_status, t_msg = compare_nx_graphs_by_topology(ref_graphs[graph_type]['nx'], target_graphs[graph_type]['nx'])
                n_status, n_msg = compare_nx_graphs_by_names(ref_graphs[graph_type]['nx'], target_graphs[graph_type]['nx'])

                if t_status:
                    match[ref_index][target_index].update({
                            graph_type: {
                                'topology_match': t_status,
                                'names_match': n_status,
                            }
                        }
                    )

    if compare_by_names:
        for ref_index in match.keys():
            target_index_list = set()
            for target_index in match[ref_index].keys():
                state = match[ref_index][target_index]
                if any([v['names_match'] is True for k, v in state.items()]):
                    target_index_list.add(target_index)

            if len(target_index_list) > 0:
                for target_index in list(match[ref_index].keys()):
                    if target_index not in target_index_list:
                        del match[ref_index][target_index]

    match_pairs = {}

    def try_kuhn(v, used):
        if v in used:
            return False
        used.add(v)
        for target_index in match[v]:
            if target_index not in match_pairs or try_kuhn(match_pairs[target_index], used):
                match_pairs[target_index] = v
                return True
        return False

    for ref_index in match:
        used = set()
        try_kuhn(ref_index, used)

    used_target_indices = set()
    used_ref_indices = set()

    model_has_diff = False

    diff_cnt = 0

    # Save comparison results
    for target_index, ref_index in match_pairs.items():
        cmp_index = target_index + "/" + ref_index

        used_ref_indices.add(ref_index)
        used_target_indices.add(target_index)

        cmp_graph_index = cmp_pass[cmp_index]
        cmp_graph_index.props = GraphIndexProps(ref_index=ref_index, target_index=target_index)

        for graph_type in ref_list[ref_index]:
            cmp_graph_type = cmp_graph_index[graph_type]
            cmp_graph_type.props = CompareProps()

            if not match[ref_index][target_index][graph_type]['topology_match']:
                model_has_diff = True
                cmp_graph_type.props.has_diff = True
                diff_cnt += 1

     #abs(ref_index - target_index)

    # Insert missing graphs
    for ref_index, ref_graphs in ref_list.items():
        if ref_index in used_ref_indices:
            continue

        # print('missing: {}'.format(ref_index))

        model_has_diff = True
        diff_cnt += 1

        cmp_graph_index = cmp_pass[ref_index]
        cmp_graph_index.props = GraphIndexProps(is_missing=True, ref_index=ref_index, target_index=None)

        for graph_type in ref_graphs:
            cmp_graph_type = cmp_graph_index[graph_type]
            cmp_graph_type.props = CompareProps(is_missing=True)

    # Insert new graphs
    for target_index, target_graphs in target_list.items():
        if target_index in used_target_indices:
            continue

        # print('new: {}'.format(target_index))

        model_has_diff = True
        diff_cnt += 1

        if target_index in cmp_pass:
            target_index += '(target)'

        cmp_graph_index = cmp_pass[target_index]
        cmp_graph_index.props = GraphIndexProps(is_new=True, ref_index=None, target_index=target_index)

        for graph_type in target_graphs:
            cmp_graph_type = cmp_graph_index[graph_type]
            cmp_graph_type.props = CompareProps(is_new=True)

    cmp_pass.props.diff_cnt = diff_cnt

    return model_has_diff


def default_pass_lists_comparison(cmp_pass, ref_list, target_list):
    diff_cnt = 0
    model_has_diff = False

    for graph_index in ref_list:
        # Graph index cmp properties
        cmp_graph_index = cmp_pass[graph_index]
        cmp_graph_index.props = GraphIndexProps()

        cmp_graph_index.props.ref_index = graph_index
        cmp_graph_index.props.target_index = graph_index

        if graph_index not in target_list:
            cmp_graph_index.props.is_missing = True
            model_has_diff = True  # TODO: update to has_missing/new/diff

        has_diff = False

        for graph_type in ref_list[graph_index]:
            cmp_graph_type = cmp_graph_index[graph_type]
            cmp_graph_type.props = CompareProps()

            if cmp_graph_index.props.is_missing or graph_type not in target_list[graph_index]:
                cmp_graph_type.props.is_missing = True
                model_has_diff = True # TODO: update to has_missing/new/diff
                msg = "Target graph is missing. Skip comparison."
            else:
                status, msg = compare_nx_graphs_by_topology(ref_list[graph_index][graph_type]['nx'], 
                                                            target_list[graph_index][graph_type]['nx'])
                if not status:
                    has_diff = True
                    cmp_graph_type.props.has_diff = True
            
            cmp_graph_type.props.cmp_log = msg

        diff_cnt += has_diff

    cmp_pass.props.diff_cnt = diff_cnt

    if diff_cnt > 0:
        model_has_diff = True

    return model_has_diff


@app.route('/compareRuns')
def compare_runs():
    selectedRunRef = request.args.get('selectedRunRef')
    selectedRunTarget = request.args.get('selectedRunTarget')

    # Return cached comparison results.
    if selectedRunRef in cmp_passes and selectedRunTarget in cmp_passes[selectedRunRef]:
        cmp = cmp_passes[selectedRunRef][selectedRunTarget]
        return jsonify({
            'models': {x: asdict(cmp[x].props) for x in cmp}
        })

    # Compare ref models/passes/graphs with target
    for model in passes[selectedRunRef]:
        # Model cmp properties
        cmp_model = cmp_passes[selectedRunRef][selectedRunTarget][model]
        cmp_model.props = ModelProps()

        if model not in passes[selectedRunTarget]:
            cmp_model.props.is_missing = True

        model_has_diff = False
        
        for pass_name in passes[selectedRunRef][model]:
            # Pass cmp properties
            cmp_pass = cmp_model[pass_name]
            cmp_pass.props = PassProps()

            if cmp_model.props.is_missing or pass_name not in passes[selectedRunTarget][model]:
                cmp_pass.props.is_missing = True
                model_has_diff = True  # TODO: update to has_missing/new/diff

            cmp_pass.props.ref_cnt = len(passes[selectedRunRef][model][pass_name].keys())
            cmp_pass.props.target_cnt = 0 if cmp_pass.props.is_missing else len(passes[selectedRunTarget][model][pass_name].keys())
            cmp_pass.props.diff_cnt = 0

            # Insert remaining part as missing to cmp_pass
            if cmp_pass.props.is_missing:
                for graph_index in passes[selectedRunRef][model][pass_name]:
                    # Graph index cmp properties
                    cmp_graph_index = cmp_pass[graph_index]
                    cmp_graph_index.props = GraphIndexProps(is_missing=True, ref_index=graph_index, target_index=None)

                    for graph_type in passes[selectedRunRef][model][pass_name][graph_index]:
                        cmp_graph_type = cmp_graph_index[graph_type]
                        cmp_graph_type.props = CompareProps(is_missing=True)

                        # Is it needed?
                    if cmp_graph_index.props.is_missing or graph_type not in passes[selectedRunTarget][model][pass_name][graph_index]:
                        cmp_graph_type.props.is_missing = True
                        cmp_graph_type.props.cmp_log = "Target graph is missing. Skip comparison."
                
                    cmp_pass.props.diff_cnt += 1
                continue
            
            # has_diff = default_pass_lists_comparison(cmp_pass, passes[selectedRunRef][model][pass_name], 
            #                                                      passes[selectedRunTarget][model][pass_name])

            logging.debug(f"start smart_pass_lists_comparison for {pass_name}")
            has_diff = smart_pass_lists_comparison(cmp_pass, passes[selectedRunRef][model][pass_name], 
                                                             passes[selectedRunTarget][model][pass_name])
            logging.debug(f"finish smart_pass_lists_comparison for {pass_name}")

            if has_diff:
                model_has_diff = True

        # Check if target run has some passes that are missing in ref run.
        if not cmp_model.props.is_missing:
            for pass_name in passes[selectedRunTarget][model]:
                if pass_name in passes[selectedRunRef][model]:
                    continue

                model_has_diff = True

                cmp_pass = cmp_model[pass_name]
                cmp_pass.props = PassProps(
                    is_new=True,
                    has_diff=True,
                    ref_cnt=0,
                    target_cnt=len(passes[selectedRunTarget][model][pass_name]),
                    diff_cnt=len(passes[selectedRunTarget][model][pass_name]),
                )

                for graph_index in passes[selectedRunTarget][model][pass_name]:
                    # Graph index cmp properties
                    cmp_graph_index = cmp_pass[graph_index]
                    cmp_graph_index.props = GraphIndexProps(is_new=True, ref_index=None, target_index=graph_index)

                    for graph_type in passes[selectedRunTarget][model][pass_name][graph_index]:
                        cmp_graph_type = cmp_graph_index[graph_type]
                        cmp_graph_type.props = CompareProps(is_new=True)

                    # if cmp_graph_index.props.is_missing or graph_type not in \
                    #         passes[selectedRunTarget][model][pass_name][graph_index]:
                    #     cmp_graph_type.props.is_missing = True
                    #     cmp_graph_type.props.cmp_log = "Ref graph is missing. Skip comparison."

        cmp_model.props.has_diff = model_has_diff

    cmp = cmp_passes[selectedRunRef][selectedRunTarget]
    return jsonify({'models': {x: asdict(cmp[x].props) for x in cmp}})


@app.route('/compareModels')
def compare_models():
    state = parse_cmp_pass_request()

    return jsonify({'passes': {x: asdict(state[x].props) for x in state}})


@app.route('/comparePasses')
def compare_passes():
    state = parse_cmp_pass_request()

    return jsonify({'graphs': {x: asdict(state[x].props) for x in state}})


@app.route('/compareGraphs')
def compare_graphs():
    state = parse_cmp_pass_request()

    return jsonify({'types': {x: asdict(state[x].props) for x in state}})


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dump_dir', type=str, default="/tmp/pass_viz")
    args = parser.parse_args()

    logging.basicConfig(
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
    )

    JSON_DUMP_DIR = args.dump_dir

    reload_json_files()

    app.run(debug=False)
