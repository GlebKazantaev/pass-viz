import React, { Component, useState, useEffect } from 'react';
import Select from 'react-select'

import MenuItems from '../components/pass_viz/MenuItems';
import MenuHeader from '../components/pass_viz/MenuHeader';
import Viz from '../components/pass_viz/GraphViz';

import './PassViz.css'


class PassViz extends Component {
    state = {
        availableRuns: {},

        models : [],
        passes : {},
        graphs : [],
        graphTypes: [],

        selectedRun: null,
        selectedModel: null,
        selectedPass: null,
        selectedGraph: null,
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

    selectRun = (selectedOption) => {
        fetch(`http://localhost:5000/models?selectedRun=${selectedOption.value}`)
        .then(responce => responce.json())
        .then(data=> {
            this.setState({
                selectedRun: selectedOption.value,
                models: data.models,
                passes: {},
                graphs: [],
                graphTypes: [],

                activeModels: 1,
                activePasses: null,
                activeGraphs: null,
                activeGraphTypes: null,

                selectedModel: null,
                selectedPass: null,
                selectedGraph: null,
                selectedGraphType: null,

                backMenuIsActive: null
            });
        });
    }

    selectModel = args => {
        fetch(`http://localhost:5000/passes?selectedRun=${this.state.selectedRun}&selectedModel=${args.name}`)
        .then(responce => responce.json())
        .then(data=> {
            this.setState({
                selectedModel: args.name,
                passes: data.passes,
                graphs: [],
                graphTypes: [],

                activeModels: null,
                activePasses: 1,
                activeGraphs: null,
                activeGraphTypes: null,

                selectedPass: null,
                selectedGraph: null,
                selectedGraphType: null,

                backMenuIsActive: 1
            });
        });
    }

    selectPass = args => {
        fetch(`http://localhost:5000/graphs?selectedRun=${this.state.selectedRun}&selectedModel=${this.state.selectedModel}&selectedPass=${args.name}`)
        .then(responce => responce.json())
        .then(data => {
            this.setState({
                selectedPass: args.name,
                graphs: data.graphs, 
                graphTypes: [],

                activeModels: null,
                activePasses: null,
                activeGraphs: 1,
                activeGraphTypes: null,

                selectedGraph: null,
                selectedGraphType: null,
                
                backMenuIsActive: 1
            });
        });
    };

    selectGraph = args => {
        fetch(`http://localhost:5000/graphTypes?selectedRun=${this.state.selectedRun}&selectedModel=${this.state.selectedModel}&selectedPass=${this.state.selectedPass}&selectedGraph=${args.name}`)
        .then(responce => responce.json())
        .then(data => {
            console.log(data.types);
            this.setState({
                graphTypes: data.types,

                activeModels: null,
                activePasses: null,
                activeGraphs: null,
                activeGraphTypes: 1,

                selectedGraph: args.name,
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
    
                selectedGraph: null,
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
                selectedGraph: null,
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
                selectedGraph: null,
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
        return (<></>);
    }

    pass_item_label = args => {
        return (<span className="badge rounded-pill bg-dark">{args.count}</span>);
    }

    render() {
        return (
            <div className='PassViz' style={{gridTemplateColumns: `${this.state.navWidth} auto`}}>
                <div className='NavigationBar'>
                    <div className='PassVizRunSelector'>
                        <Select className='Selector'
                                onChange={this.selectRun} 
                                options={this.state.availableRuns} />
                    </div>
                    <MenuHeader backMenu={this.backMenu} back_is_active={this.state.backMenuIsActive} is_active={this.state.selectedRun} />
                    <div className='MenuBar'>
                        <MenuItems items={this.state.models} 
                                   select_item={this.selectItem}
                                   label={this.default_item_label}
                                   is_active={this.state.activeModels}/>
                        <MenuItems items={this.state.passes} 
                                   select_item={this.selectItem}
                                   label={this.pass_item_label}
                                   is_active={this.state.activePasses}/>
                        <MenuItems items={this.state.graphs}
                                   select_item={this.selectItem}
                                   label={this.default_item_label}
                                   is_active={this.state.activeGraphs}/>
                        <MenuItems items={this.state.graphTypes}
                                   select_item={this.selectItem}
                                   label={this.default_item_label}
                                   is_active={this.state.activeGraphTypes}/>
                    </div>
                </div>
                <Viz selectedRun={this.state.selectedRun}
                     selectedModel={this.state.selectedModel}
                     selectedPass={this.state.selectedPass}
                     selectedGraph={this.state.selectedGraph}
                     selectedGraphType={this.state.selectedGraphType}
                     progressBar={this.props.progressBar}
                     changeNavWidth={this.changeNavWidth}/>
            </div>
        );
    }
}
 
export default PassViz;