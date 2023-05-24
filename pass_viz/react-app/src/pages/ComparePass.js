import React, { Component, useState, useEffect } from 'react';
import Select from 'react-select'

import MenuItems from '../components/pass_viz/MenuItems';
import MenuHeader from '../components/pass_viz/MenuHeader';
import Viz from '../components/pass_viz/GraphViz'

import 'bootstrap/dist/css/bootstrap.css';

import './ComparePass.css'


class ComparePass extends Component {
    state = {
        availableRuns: {},

        models : [],
        passes : {},
        graphs : [],
        graphTypes: [],

        selectedRunRef: null,
        selectedRunTarget: null,

        selectedModel: null,
        selectedPass: null,
        selectedGraphRef: null,
        selectedGraphTarget: null,
        selectedGraphType: null,

        activeModels: null,
        activePasses: null,
        activeGraphs: null,
        activeGraphTypes: null,

        navWidth: "450px",
        backMenuIsActive: null
    };

    componentDidMount() {
        fetch('http://localhost:5000/availableRuns')
        .then(responce => responce.json())
        .then(data=> {
            this.setState({availableRuns: data.runs});
        });
    }

    selectRunRef = (selectedOption) => {
        this.setState({
            selectedRunRef: selectedOption.value
        });
    }

    selectRunTarget = (selectedOption) => {
        this.setState({
            selectedRunTarget: selectedOption.value
        });
    }

    compareRuns = args => {
        if (!this.state.selectedRunRef || !this.state.selectedRunTarget) {
            return;
        }
        fetch(`http://localhost:5000/compareRuns?selectedRunRef=${this.state.selectedRunRef}&selectedRunTarget=${this.state.selectedRunTarget}`)
        .then(responce => responce.json())
        .then(data=> {
            this.setState({
                models: data.models,
                passes: {},
                graphs: {},
                graphTypes: {},

                activeModels: 1,
                activePasses: null,
                activeGraphs: null,
                activeGraphTypes: null,

                selectedModel: null,
                selectedPass: null,
                selectedGraphRef: null,
                selectedGraphTarget: null,
                selectedGraphType: null
            });
        });
        // this.props.progressBar(0);
    }

    selectModel = args => {
        fetch(`http://localhost:5000/compareModels?selectedRunRef=${this.state.selectedRunRef}&selectedRunTarget=${this.state.selectedRunTarget}&selectedModel=${args.name}`)
        .then(responce => responce.json())
        .then(data=> {
            console.log(data.passes)
            console.log(Object.keys(data.passes))
            this.setState({
                selectedModel: args.name,
                passes: data.passes,
                graphs: {},
                graphTypes: {},

                activeModels: null,
                activePasses: 1,
                activeGraphs: null,
                activeGraphTypes: null,

                selectedPass: null,
                selectedGraphRef: null,
                selectedGraphTarget: null,
                selectedGraphType: null,

                backMenuIsActive: 1
            });
        });
    }

    selectPass = args => {
        fetch(`http://localhost:5000/comparePasses?selectedRunRef=${this.state.selectedRunRef}&selectedRunTarget=${this.state.selectedRunTarget}&selectedModel=${this.state.selectedModel}&selectedPass=${args.name}`)
        .then(responce => responce.json())
        .then(data => {
            console.log(data);
            this.setState({
                selectedPass: args.name,
                graphs: data.graphs, 
                graphTypes: {},

                activeModels: null,
                activePasses: null,
                activeGraphs: 1,
                activeGraphTypes: null,

                selectedGraphRef: null,
                selectedGraphTarget: null,
                selectedGraphType: null,
                
                backMenuIsActive: 1
            });
        });
    };

    selectGraph = args => {
        fetch(`http://localhost:5000/compareGraphs?selectedRunRef=${this.state.selectedRunRef}&selectedRunTarget=${this.state.selectedRunTarget}&selectedModel=${this.state.selectedModel}&selectedPass=${this.state.selectedPass}&selectedGraph=${args.name}`)
        .then(responce => responce.json())
        .then(data => {
            this.setState({
                graphTypes: data.types,

                activeModels: null,
                activePasses: null,
                activeGraphs: null,
                activeGraphTypes: 1,

                selectedGraphRef: this.state.graphs[args.name]['ref_index'],
                selectedGraphTarget: this.state.graphs[args.name]['target_index'],
                selectedGraphType: null,

                backMenuIsActive: 1
            });
        });
    };

    selectGraphType = args => {
        this.setState({
            selectedGraphType: args.name,
        });
    };

    selectItem = args => {
        if (this.state.activeModels) {
            return this.selectModel(args);
        }
        if (this.state.activePasses) {
            return this.selectPass(args);
        }
        if (this.state.activeGraphs) {
            return this.selectGraph(args);
        }
        if (this.state.activeGraphTypes) {
            return this.selectGraphType(args);
        }
    };

    backMenu = args => {
        if (this.state.activeGraphTypes) {
            this.setState({
                graphTypes: [],
    
                selectedGraphRef: null,
                selectedGraphTarget: null,
                selectedGraphType: null,
    
                activeModels: null,
                activePasses: null,
                activeGraphs: 1,
                activeGraphTypes: null,

                backMenuIsActive: 1                
            });
        } else if (this.state.activeGraphs) {
            this.setState({
                graphs: [],
    
                selectedPass: null,
                selectedGraphRef: null,
                selectedGraphTarget: null,
                selectedGraphType: null,
    
                activeModels: null,
                activePasses: 1,
                activeGraphs: null,
                activeGraphTypes: null,

                backMenuIsActive: 1                
            });
        } else if (this.state.activePasses) {
            this.setState({
                passes: {},
    
                selectedModel: null,
                selectedPass: null,
                selectedGraphRef: null,
                selectedGraphTarget: null,
                selectedGraphType: null,
    
                activeModels: 1,
                activePasses: null,
                activeGraphs: null,
                activeGraphTypes: null,

                backMenuIsActive: null
            });
        }
    };

    changeNavWidth = args => {
        if (args.clientX === 0) {
            return;
        }
        this.setState({navWidth: `${args.clientX}px`});
    }

    default_item_label = args => {
        return (<div></div>);
    }

    pass_label = args => {
        console.log(args);
        var font_color = "green";
        var diff_font_color = "green";
        if (args.target_cnt != args.ref_cnt) {
            font_color = "red";
        }
        if (args.diff_cnt > 0) {
            diff_font_color = "red";
        }
        return (
            <div className='PassInfo'>
                <div style={{color: font_color}}>{args.ref_cnt + "/" + args.target_cnt}</div>
                <div style={{color: diff_font_color}}>{"diff: " + args.diff_cnt}</div>
            </div>
        )
    }

    graph_index_label = args => {
        var status = "match";
        var font_color = "green";
        if (args.is_new) {
            status = "new";
            font_color = "orange";
        }
        if (args.is_missing) {
            status = "missing";
            font_color = "red";
        }
        if (args.has_diff) {
            status = "diff";
            font_color = "red";
        }
        return (
            <div className='GraphIndexInfo'>
                <div style={{color: font_color}}>{status}</div>
            </div>
        )
    }

    render() {
        return (
            <div className='ComparePass' style={{gridTemplateColumns: `${this.state.navWidth} auto`}}>
                <div className='NavigationBarCmp'>
                    <div className='RefRunSelector'>
                        <Select className='Ref Selector'
                                onChange={this.selectRunRef} 
                                options={this.state.availableRuns} />
                    </div>
                    <div className='TargetRunSelector'>
                        <Select className='Target Selector'
                                onChange={this.selectRunTarget} 
                                options={this.state.availableRuns} />
                    </div>
                    <div className='Compare'>
                        <div className="CompareButton btn-primary rounded" onClick={this.compareRuns}>
                            Compare
                        </div>
                    </div>
                    <MenuHeader backMenu={this.backMenu} back_is_active={this.state.backMenuIsActive} is_active={this.state.selectedRunTarget && this.state.selectedRunRef} />
                    <div className='MenuBarCmp'>
                        <MenuItems items={this.state.models} 
                                   select_item={this.selectItem}
                                   label={this.graph_index_label}
                                   is_active={this.state.activeModels}/>
                        <MenuItems items={this.state.passes} 
                                   select_item={this.selectItem}
                                   label={this.pass_label}
                                   is_active={this.state.activePasses}/>
                        <MenuItems items={this.state.graphs}
                                   select_item={this.selectItem}
                                   label={this.graph_index_label}
                                   is_active={this.state.activeGraphs}/>
                        <MenuItems items={this.state.graphTypes}
                                   select_item={this.selectItem}
                                   label={this.graph_index_label}
                                   is_active={this.state.activeGraphTypes}/>
                    </div>
                </div>
                <div className='VizHandler'>
                    <Viz className='VizReference'
                        selectedRun={this.state.selectedRunRef}
                        selectedModel={this.state.selectedModel}
                        selectedPass={this.state.selectedPass}
                        selectedGraph={this.state.selectedGraphRef}
                        selectedGraphType={this.state.selectedGraphType}
                        changeNavWidth={this.changeNavWidth}/>
                    <Viz className='VizTarget'
                        selectedRun={this.state.selectedRunTarget}
                        selectedModel={this.state.selectedModel}
                        selectedPass={this.state.selectedPass}
                        selectedGraph={this.state.selectedGraphTarget}
                        selectedGraphType={this.state.selectedGraphType}
                        changeNavWidth={this.changeNavWidth}/>
                </div>
            </div>
        );
    }
}
 
export default ComparePass;