from flask import Flask, jsonify, request
from flask_cors import CORS
import pickle
from copy import copy

import networkx as nx

from collections import defaultdict
# from collect_passes import collect

app = Flask(__name__)
CORS(app)

class NestedDict(defaultdict):
	def __init__(self, args):
		super().__init__(args)
		self._custom_properties = {}
	
	@property
	def props(self):
		return self._custom_properties

def nested_dict():
	return NestedDict(nested_dict)

passes = nested_dict()
# Description
# passes[run_name] = {model_name: {}}
# passes[run_name][model_name] = {pass_name: {}}
# passes[run_name][model_name][pass_name] = {graph_index: {}}
# passes[run_name][model_name][pass_name][graph_index] = {graph_type: {}}
# passes[run_name][model_name][pass_name][graph_index][graph_type] = dot

cmp_passes = nested_dict()
# Description
# cmp_passes[run_name] = {model_name: {}}
# cmp_passes[run_name][model_name] = {pass_name: {}, is_new=bool, is_missing=bool}
# cmp_passes[run_name][model_name][pass_name] = {graph_index: {}, is_new=bool, is_missing=bool, ref_cnt=int, target_cnt=int, diff_cnt=int}
# cmp_passes[run_name][model_name][pass_name][graph_index] = {graph_type: {}, is_new=bool, is_missing=bool, has_diff=bool}
# cmp_passes[run_name][model_name][pass_name][graph_index][graph_type] = {graph_ref: dot, graph_target: dot, is_new=bool, is_missing=bool, has_diff=bool, log: str}
# cmp_passes[(run_name_ref, run_name_target)][model_name][pass_name][graph_index][graph_type] = cmp_status

def json_to_dot(path_to_json: str):
	import json
	f = open(path_to_json)
	data = json.load(f)

	g = nx.DiGraph()

	dot = "digraph \"{}\" {{\n".format(data['pass_name'])

	dot += "node [shape=box style=rounded]\n";
	dot += "edge [fontsize=10 color=gra40 fontcolor=gra40]\n"

	for unique_node_name, props in data['nodes'].items():
		dot += "\"" + unique_node_name + "\""
		if 'color' in props['dot_attrs']:
			dot += " [color={}]".format(props['dot_attrs']['color']) # TODO: pass through all attributes
		dot += '\n'

		g.add_nodes_from([(unique_node_name, props['attrs'])])


	for a, b in data['edges'].items():
		for to in b:
			dot += "\"" + a + "\"" + "->" + "\"" + to + "\"" + "\n"
			g.add_edge(a, to)

	dot += "}"

	run_name, model_name = data['run_name'], data['model_name']
	pass_name, graph_index, get_graph_types = data['pass_name'], data['index'], data['type']
	passes[run_name][model_name][pass_name][graph_index][data['type']]['dot'] = dot
	passes[run_name][model_name][pass_name][graph_index][data['type']]['nx'] = g
	passes[run_name][model_name][pass_name][graph_index][data['type']]['nodes'] = data['nodes']

import glob
# for path in glob.glob('/Users/gleb_dmitrievich/Work/repos/openvino/bin/intel64/RelWithDebInfo/*.json'):
for path in glob.glob('/Users/gleb_dmitrievich/Work/repos/pass-viz/backend/dump/*.json'):
	print("Loading: {}".format(path))
	json_to_dot(path)

@app.route('/availableRuns')
def get_available_runs():
	return jsonify({
		"runs": [{'value': x, 'label': x} for x in passes.keys()]
	})

@app.route('/models')
def get_models():
	selectedRun = request.args.get('selectedRun')

	return jsonify({
		"models": {x: {} for x in passes[selectedRun].keys()}
	})

@app.route('/passes')
def get_passes():
	selectedRun = request.args.get('selectedRun')
	selectedModel = request.args.get('selectedModel')

	return jsonify({
		"passes": {x: {'count': len(passes[selectedRun][selectedModel][x].keys())} for x in passes[selectedRun][selectedModel].keys()},	
	})

@app.route('/graphs')
def get_graphs():
	selectedRun = request.args.get('selectedRun')
	selectedModel = request.args.get('selectedModel')
	selectedPass = request.args.get('selectedPass')

	return jsonify({
		"graphs": {x: {} for x in passes[selectedRun][selectedModel][selectedPass].keys()}
	})

@app.route('/graphTypes')
def get_graph_types():
	selectedRun = request.args.get('selectedRun')
	selectedModel = request.args.get('selectedModel')
	selectedPass = request.args.get('selectedPass')
	selectedGraph = request.args.get('selectedGraph')
	return jsonify({
		"types": {x: {} for x in passes[selectedRun][selectedModel][selectedPass][selectedGraph].keys()}
	})

@app.route('/graph')
def get_graph():
	selectedRun = request.args.get('selectedRun')
	selectedModel = request.args.get('selectedModel')
	selectedPass = request.args.get('selectedPass')
	selectedGraph = request.args.get('selectedGraph')
	graphType = request.args.get('graphType')

	if selectedRun not in passes or \
	   selectedModel not in passes[selectedRun] or \
	   selectedPass not in passes[selectedRun][selectedModel] or \
	   selectedGraph not in passes[selectedRun][selectedModel][selectedPass] or \
	   graphType not in passes[selectedRun][selectedModel][selectedPass][selectedGraph]:
	   return jsonify({
		   "graph": "digraph G { end [shape=Square label=\"Graph Is Missing\"];}"
	   })

	return jsonify({
		"graph": passes[selectedRun][selectedModel][selectedPass][selectedGraph][graphType]['dot']
	})

@app.route('/attrs')
def get_node_attrs():
	selectedRun = request.args.get('selectedRun')
	selectedModel = request.args.get('selectedModel')
	selectedPass = request.args.get('selectedPass')
	selectedGraph = request.args.get('selectedGraph')
	graphType = request.args.get('graphType')
	nodeName = request.args.get('nodeName')

	if selectedRun not in passes or \
	   selectedModel not in passes[selectedRun] or \
	   selectedPass not in passes[selectedRun][selectedModel] or \
	   selectedGraph not in passes[selectedRun][selectedModel][selectedPass] or \
	   graphType not in passes[selectedRun][selectedModel][selectedPass][selectedGraph] or \
	   nodeName not in passes[selectedRun][selectedModel][selectedPass][selectedGraph][graphType]['nodes']:
	   return jsonify({'name': None, 'type': None}) # TODO: raise error

	return jsonify({
		"attrs": passes[selectedRun][selectedModel][selectedPass][selectedGraph][graphType]['nodes'][nodeName]['attrs']
	})


@app.route('/remove')
def remove_run():
	selectedRun = request.args.get('selectedRun')
	del passes[selectedRun]
	return jsonify({})

# COMPARE PART

model_props = {
	'is_missing': False,
	'is_new': False,
	'has_diff': False,
}

pass_props = {
	'is_missing': False,
	'is_new': False,

	'ref_cnt': None,
	'target_cnt': None,
	'diff_cnt': None,
}

graph_index_props = {
	'is_missing': False,
	'is_new': False,
	'has_diff': False,

	'ref_index': None,
	'target_index': None,
}

cmp_props = {
	'is_missing': False,
	'is_new': False,
	
	'has_diff': False,

	'cmp_log': "",
}

def compare_nodes(a, b):
	if 'type' in a and 'type' in b:
		return a['type'] == b['type']
	return True

def compare_nx_graphs_by_topology(a, b):
	return nx.is_isomorphic(a, b, compare_nodes), ""

def compare_nx_graphs_by_names(a, b):
	return True, ""

def smart_pass_lists_comparison(cmp_pass, ref_list, target_list, compare_by_topology = True, compare_by_names = True):
	match = nested_dict()

	# Comparison algorithm:
	# 1. Iterate over all ref graphs and match with any target graphs.
	#    Result will be stored in match dict where key is ref_pass_idnex
	#    and value is a list of target_pass_indexes that was sucessfully matched.
	# 2. For cases when graph of passes still not bipartite, we run 
	#    kun algorithm to remove excess match connections between passes
	#    and make graph bipartite.

	for ref_index, ref_graphs in ref_list.items():
		for target_index, target_graphs in target_list.items():
			# TODO: relax this statement
			# Skip comparison if nubmer of graph types or their names are different
			if set(ref_graphs.keys()) != set(target_graphs.keys()):
				# print('skip: {} {} because {} != {}'.format(ref_index, target_index, set(ref_graphs.keys()), set(target_graphs.keys())))
				continue

			for graph_type in ref_graphs:
				t_status, t_msg = compare_nx_graphs_by_topology(ref_graphs[graph_type]['nx'], target_graphs[graph_type]['nx'])
				n_status, n_msg = compare_nx_graphs_by_names(ref_graphs[graph_type]['nx'], target_graphs[graph_type]['nx'])

				if (not compare_by_topology or t_status == compare_by_topology) and (not compare_by_names or n_status == compare_by_names):
					match[ref_index][target_index].update({graph_type: {
						'topology_match': t_status,
						'names_match': n_status,
					}})

					# print('initial pair: {} {} {}'.format(ref_index, target_index, graph_type))

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

	# Save comparison results
	for target_index, ref_index in match_pairs.items():
		cmp_index = target_index + "/" + ref_index

		# print('final pair: {} {}'.format(ref_index, target_index))

		used_ref_indices.add(ref_index)
		used_target_indices.add(target_index)

		cmp_graph_index = cmp_pass[cmp_index]
		cmp_graph_index.props.update(graph_index_props)
		cmp_graph_index.props['ref_index'] = ref_index
		cmp_graph_index.props['target_index'] = target_index

		for graph_type in ref_list[ref_index]:
			cmp_graph_type = cmp_graph_index[graph_type]
			cmp_graph_type.props.update(cmp_props)

			if not match[ref_index][target_index][graph_type]['topology_match']:
				model_has_diff = True
				cmp_graph_type.props['has_diff'] = True

	# Insert missing graphs
	for ref_index, ref_graphs in ref_list.items():
		if ref_index in used_ref_indices:
			continue

		# print('missing: {}'.format(ref_index))

		model_has_diff = True

		cmp_graph_index = cmp_pass[ref_index]
		cmp_graph_index.props.update(graph_index_props)
		cmp_graph_index.props['is_missing'] = True
		cmp_graph_index.props['ref_index'] = ref_index
		cmp_graph_index.props['target_index'] = None

		for graph_type in ref_graphs:
			cmp_graph_type = cmp_graph_index[graph_type]
			cmp_graph_type.props.update(cmp_props)
			cmp_graph_type.props['is_missing'] = True

	# Insert new graphs
	for target_index, target_graphs in target_list.items():
		if target_index in used_target_indices:
			continue

		# print('new: {}'.format(target_index))

		model_has_diff = True

		if target_index in cmp_pass:
			target_index += '(target)'

		cmp_graph_index = cmp_pass[target_index]
		cmp_graph_index.props.update(graph_index_props)
		cmp_graph_index.props['is_new'] = True
		cmp_graph_index.props['ref_index'] = None
		cmp_graph_index.props['target_index'] = target_index

		for graph_type in target_graphs:
			cmp_graph_type = cmp_graph_index[graph_type]
			cmp_graph_type.props.update(cmp_props)
			cmp_graph_type.props['is_new'] = True

	return model_has_diff


def default_pass_lists_comparison(cmp_pass, ref_list, target_list):
	diff_cnt = 0
	model_has_diff = False

	for graph_index in ref_list:
		# Graph index cmp properties
		cmp_graph_index = cmp_pass[graph_index]
		cmp_graph_index.props.update(graph_index_props)

		cmp_graph_index.props['ref_index'] = graph_index
		cmp_graph_index.props['target_index'] = graph_index

		if graph_index not in target_list:
			cmp_graph_index.props['is_missing'] = True
			model_has_diff = True # TODO: update to has_missing/new/diff

		has_diff = False

		for graph_type in ref_list[graph_index]:
			cmp_graph_type = cmp_graph_index[graph_type]
			cmp_graph_type.props.update(cmp_props)

			if cmp_graph_index.props['is_missing'] or graph_type not in target_list[graph_index]:
				cmp_graph_type.props['is_missing'] = True
				model_has_diff = True # TODO: update to has_missing/new/diff
				msg = "Target graph is missing. Skip comparison."
			else:
				status, msg = compare_nx_graphs_by_topology(ref_list[graph_index][graph_type]['nx'], 
															target_list[graph_index][graph_type]['nx'])
				if not status:
					has_diff = True
					cmp_graph_type.props['has_diff'] = True
			
			cmp_graph_type.props['cmp_log'] = msg

		diff_cnt += has_diff

	cmp_pass.props['diff_cnt'] = diff_cnt

	if diff_cnt > 0:
		model_has_diff = True

	return model_has_diff


@app.route('/compareRuns')
def compare_runs():
	selectedRunRef = request.args.get('selectedRunRef')
	selectedRunTarget = request.args.get('selectedRunTarget')

	cmp = (selectedRunRef, selectedRunTarget)

	# if cmp in cmp_passes:
	# 	return jsonify({'models': {x : cmp_passes[cmp][x].props for x in cmp_passes[cmp]}})

	# Compare ref models/passes/graphs with target
	for model in passes[selectedRunRef]:
		# Model cmp properties
		cmp_model = cmp_passes[cmp][model]
		cmp_model.props.update(model_props)

		if model not in passes[selectedRunTarget]:
			cmp_model.props['is_missing'] = True

		model_has_diff = False
		
		for pass_name in passes[selectedRunRef][model]: 
			# Pass cmp properties
			cmp_pass = cmp_model[pass_name]
			cmp_pass.props.update(pass_props)

			if cmp_model.props['is_missing'] or pass_name not in passes[selectedRunTarget][model]:
				cmp_pass.props['is_missing'] = True
				model_has_diff = True # TODO: update to has_missing/new/diff

			cmp_pass.props['ref_cnt'] = len(passes[selectedRunRef][model][pass_name].keys())
			cmp_pass.props['target_cnt'] = 0 if cmp_pass.props['is_missing'] else len(passes[selectedRunTarget][model][pass_name].keys())

			# Insert remaining part as missing to cmp_pass
			if cmp_pass.props['is_missing']:
				for graph_index in passes[selectedRunRef][model][pass_name]:
					# Graph index cmp properties
					cmp_graph_index = cmp_pass[graph_index]
					cmp_graph_index.props.update(graph_index_props)
					cmp_graph_index.props['is_missing'] = True
					cmp_graph_index.props['ref_index'] = graph_index
					cmp_graph_index.props['target_index'] = None
					
					for graph_type in passes[selectedRunRef][model][pass_name][graph_index]:
						cmp_graph_type = cmp_graph_index[graph_type]
						cmp_graph_type.props.update(cmp_props)
						cmp_graph_type.props['is_missing'] = True

					if cmp_graph_index.props['is_missing'] or graph_type not in passes[selectedRunTarget][model][pass_name][graph_index]:
						cmp_graph_type.props['is_missing'] = True
						cmp_graph_type.props['cmp_log'] = "Target graph is missing. Skip comparison."
				
				cmp_pass.props['diff_cnt'] = 0
				continue
			
			# has_diff = default_pass_lists_comparison(cmp_pass, passes[selectedRunRef][model][pass_name], 
			# 										  		   passes[selectedRunTarget][model][pass_name])

			has_diff = smart_pass_lists_comparison(cmp_pass, passes[selectedRunRef][model][pass_name], 
															passes[selectedRunTarget][model][pass_name])

			if has_diff:
				model_has_diff = True

		cmp_model.props['has_diff'] = model_has_diff

    # import json
    # print(json.dumps(cmp_passes[cmp], indent=4))

	# Search for new models/passes/graphs in target compared to reference
	# for model in passes[selectedRunTarget]:
	# 	cmp_model = cmp_passes[cmp][model]
	# 	if model not in passes[selectedRunRef]:
	# 		cmp_model.props.update(model_props)
	# 		cmp_model.props['is_new'] = True
		
	# 	for pass_name in passes[selectedRunTarget][model]: 
	# 		cmp_pass = cmp_model[pass_name]
	# 		if cmp_model.props['is_new'] or pass_name not in passes[selectedRunRef][model]:
	# 			cmp_pass.props.update(pass_props)
	# 			cmp_pass.props['is_new'] = True
	# 			cmp_pass.props['ref_cnt'] = 0
	# 			cmp_pass.props['target_cnt'] = len(passes[selectedRunTarget][model][pass_name].keys())

	# 		diff_cnt = 0
			
	# 		for graph_index in passes[selectedRunTarget][model][pass_name]:
	# 			cmp_graph_index = cmp_pass[graph_index]
	# 			if cmp_pass.props['is_new'] or graph_index not in passes[selectedRunRef][model][pass_name]:
	# 				cmp_graph_index.props.update(graph_index_props)
	# 				cmp_graph_index.props['is_new'] = True

	# 			for graph_type in passes[selectedRunTarget][model][pass_name][graph_index]:
	# 				cmp_graph_type = cmp_graph_index[graph_type]
	# 				if cmp_graph_index.props['is_new'] or graph_type not in passes[selectedRunRef][model][pass_name][graph_index]:
	# 					cmp_graph_type.props.update(cmp_props)
	# 					cmp_graph_type.props['is_new'] = True
	# 					cmp_graph_type.props['cmp_log'] = "Ref graph is missing. Skip comparison."

	# 					cmp_graph_type.props['ref_index'] = None
	# 					cmp_graph_type.props['target_index'] = graph_index
	
	return jsonify({'models': {x : cmp_passes[cmp][x].props for x in cmp_passes[cmp]}})

@app.route('/compareModels')
def compare_models():
	selectedRunRef = request.args.get('selectedRunRef')
	selectedRunTarget = request.args.get('selectedRunTarget')
	selectedModel = request.args.get('selectedModel')

	cmp = (selectedRunRef, selectedRunTarget)

	return jsonify({'passes': {x : cmp_passes[cmp][selectedModel][x].props for x in cmp_passes[cmp][selectedModel]}})

@app.route('/comparePasses')
def compare_passes():
	selectedRunRef = request.args.get('selectedRunRef')
	selectedRunTarget = request.args.get('selectedRunTarget')
	selectedModel = request.args.get('selectedModel')
	selectedPass = request.args.get('selectedPass')

	cmp = (selectedRunRef, selectedRunTarget)

	return jsonify({'graphs': {x : cmp_passes[cmp][selectedModel][selectedPass][x].props for x in cmp_passes[cmp][selectedModel][selectedPass]}})

@app.route('/compareGraphs')
def compare_graphs():
	selectedRunRef = request.args.get('selectedRunRef')
	selectedRunTarget = request.args.get('selectedRunTarget')
	selectedModel = request.args.get('selectedModel')
	selectedPass = request.args.get('selectedPass')
	selectedGraph = request.args.get('selectedGraph')

	cmp = (selectedRunRef, selectedRunTarget)

	return jsonify({'types': {x : cmp_passes[cmp][selectedModel][selectedPass][selectedGraph][x].props for x in cmp_passes[cmp][selectedModel][selectedPass][selectedGraph]}})

if __name__ == '__main__':
	app.run(debug=True)