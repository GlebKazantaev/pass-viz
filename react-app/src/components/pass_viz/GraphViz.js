import React, { Component } from 'react';
import { useState, useEffect, useRef } from 'react';
import { graphviz} from 'd3-graphviz';
import * as FaIcons from 'react-icons/fa';
import * as d3 from 'd3';
import Select from 'react-select'

import './GraphViz.css'
import 'bootstrap/dist/css/bootstrap.css'

import { ProgressBar, Offcanvas, Modal, Button, Table } from 'react-bootstrap';

class MyGraphviz extends React.Component {
    state = {
        activeTransition: null,
        graph: null,
    }

    constructor(props) {
        super(props);
        this.render = () => {
            if (this.props.selectedRun == null ||
                this.props.selectedModel == null ||
                this.props.selectedGraph == null ||
                this.props.selectedPass == null ||
                this.props.selectedGraphType == null ||
                this.props.isDragging == 1) {
                return (<div className={this.props.className + this.id + ' Graph'} id={this.id}></div>);
            }
            return (<div className={this.props.className + this.id + ' Graph'} id={this.id}></div>);
        };
        this.componentDidMount = () => {
            console.log("Graph#Mount");
            this.renderGraph();
        };
        this.componentDidUpdate = () => {
            console.log("Graph#Update");
            this.renderGraph();
        };
        this.onNodeClick = (d) => {
            fetch(`http://localhost:5000/attrs?selectedRun=${this.props.selectedRun}&selectedModel=${this.props.selectedModel}&selectedPass=${this.props.selectedPass}&selectedGraph=${this.props.selectedGraph}&graphType=${this.props.selectedGraphType}&nodeName=${d.node().key}`)
            .then(responce => responce.json())
            .then(data => {
                this.props.showNodeAttributes(data.attrs);
            });
        };
        this.renderGraph = () => {
            if (this.props.selectedRun == null ||
                this.props.selectedModel == null ||
                this.props.selectedGraph == null ||
                this.props.selectedPass == null ||
                this.props.selectedGraphType == null ||
                this.props.isDragging == 1) {
                return (<div className={this.props.className + this.id + ' Graph'} id={this.id}></div>);
            }
            console.log("Graph#render");
            console.log(this.props.isDragging);

            fetch(`http://localhost:5000/graph?selectedRun=${this.props.selectedRun}&selectedModel=${this.props.selectedModel}&selectedPass=${this.props.selectedPass}&selectedGraph=${this.props.selectedGraph}&graphType=${this.props.selectedGraphType}`)
            .then(responce => responce.json())
            .then(data => {
                var g = graphviz(`#${this.id}`)
                        // .on("initEnd", () => { this.props.progressBarChange(10) })
                        // .on("start", () => { this.props.progressBarChange(20) })
                        // .on("layoutStart", () => { this.props.progressBarChange(30) })
                        // .on("layoutEnd", () => { this.props.progressBarChange(40) })
                        // .on("dataExtractEnd", () => { this.props.progressBarChange(50)})
                        // .on("dataProcessPass1End", () => { this.props.progressBarChange(60)})
                        // .on("dataProcessPass2End", () => { this.props.progressBarChange(70)})
                        // .on("dataProcessEnd", () => { this.props.progressBarChange(80)})
                        // .on("renderStart", () => { this.props.progressBarChange(90)})
                        // .on("renderEnd", () => { this.props.progressBarChange(95)})
                        // .on("end", () => { this.props.progressBarChange(100) })
                        .options(Object.assign(Object.assign({}, MyGraphviz.defaultOptions), this.props.options || {}))
                        .renderDot(data.graph);
                if (this.state.graph == null) {
                    this.setState({graph : g});
                }

                const t = d3.transition()
                            .duration(750)
                            .ease(d3.easeLinear);

                g.transition(t);
                
                // g.transition("translate (0, 0) scale(1)");
                // g.render();

                d3.selectAll(".node").on('click', (d) => {
                    this.onNodeClick(d3.select(d));
                });
                // d3.selectAll(".node").each(function(d, i) {
                //     console.log(d3.select(this).on('onclick', this.onNodeClick));
                // });

                // nodes.on('click', () => { this.onNodeClick(3) });
                // console.log(g.transition());
            });

            
            // console.log(graphviz(`#${this.id}`).active());
            // var g = d3.graphviz(`#${this.id}`);
            // this.setState({activeTransition: g.active(`#${this.id}`)});
            // console.log(g.active(`#${this.id}`));
            // d3.selectAll('.graph').attr('fill', 'red');
        };
        this.id = `graphviz${MyGraphviz.count}`;
        MyGraphviz.count += 1;
    }

    graphChange = (name, scale) => {
        // var zoom = d3.zoom();
        // d3.select('g').transition()
        //               .duration(750)
        //               .attr("transform", "translate(0,0) scale(1.5)");
        // zoom.scale(1.5); 
        // zoom.translate([100, 100]);

        // const t = d3.select('g').transition()
        //             .duration(750)
        //             .attr("transform", "translate(0,0) scale(1.5)");

        var a = parseInt(d3.select(`#${name}`).select("text").attr("x")) - 300;
        var b = parseInt(d3.select(`#${name}`).select("text").attr("y")) - 100;

        console.log(a, b);
        console.log(typeof(a));

        
        var zoom = this.state.graph.zoomBehavior();
        var selection = this.state.graph.zoomSelection();

        zoom.scaleTo(selection, scale);
        zoom.translateTo(selection, a, b, [0, 0]);

        // zoom.scaleTo(selection, 0.5);
        // this.state.graph.render();

        
        // this.state.graph.scale(0.5);
        // this.state.graph.render();

        // g.transition("translate (0, 0) scale(1)");
        // g.render();
        // d3.selectAll(".graph").attr('transform', 'translate(100, 100) scale(1)');
    }
}

MyGraphviz.count = 0;
MyGraphviz.defaultOptions = {
    fit: true,
    zoom: true,
    scale: 1,
    zoomScaleExtent: [0.01, 20],
    width: "100%",
    height: "100%",
    tweenShapes: false,
    tweenPaths: false,
};

class Viz extends Component {
    state = {
        cursor_type : 'pointer',
        isDragging : 0,
        progressBarNow : 0,
        
        showMenu: false,
        menuWidth: 0,
        menuNodeAttrs: {},

        nodes: [
            {"label" : "node1", "value" : "node1"},
            {"label" : "node2", "value" : "node2"},
            {"label" : "node3", "value" : "node3"},
            {"label" : "node4", "value" : "node4"},
        ],
    }

    showMenu = args => {
        this.setState({menuWidth : 300, showMenu : true});
    }

    hideMenu = args => {
        this.setState({menuWidth : 0, showMenu : false});
    }

    updateNodes = args => {
        this.setState({nodes : args.nodes});
    }

    // showSearchMenu = () => {
    //     this.setState({showSearchMenu : true});
    // }

    // hideSearchMenu = () => {
    //     this.setState({showSearchMenu : false});
    // }

    cursorResized = args => {
        this.setState({cursor_type: 'col-resize'});
    }

    cursorOrig = e => {
        this.setState({cursor_type: 'pointer'});
    }

    stopDrag = e => {
        console.log("stop_drag");
        document.removeEventListener('mousemove', this.props.changeNavWidth);
        this.setState({ isDragging: 0});
    }

    startDrag = e => {
        console.log("start_drag");
        document.addEventListener('mousemove', this.props.changeNavWidth);
        this.setState({ isDragging: 1});

        document.addEventListener("mouseup", (args) => {
            this.stopDrag(e);
        });
    }

    progressBarChange = (args) => {
        this.setState({ progressBarNow : args.now });
    }

    renderMenu = () => {
        if (!this.state.showMenu) {
            return (
                <div className='GraphVizMenu' style={{"width": `${this.state.menuWidth}px`}}/>
            );
        }

        return (
            <div className='GraphVizMenu' style={{"width": `${this.state.menuWidth}px`}}>
                <FaIcons.FaWindowClose className='MenuExitIcon' onClick={this.hideMenu}/>
                <Table className="MenuAttributes" striped bordered hover>
                    <thead>
                        <tr>
                            <th>Attr</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.keys(this.state.menuNodeAttrs).map((attr_name, index) =>
                            <tr key={index}>
                                <td>{attr_name}</td>
                                <td>{this.state.menuNodeAttrs[attr_name]}</td>
                            </tr>
                        )}
                    </tbody>
            </Table>
            </div>
        );
    }

    showNodeAttributes = args => {
        this.showMenu();
        this.setState({menuNodeAttrs : args});
    }

    render() {
        return (
            <div className='Viz rounded'>
                {/* <ProgressBar animated now={this.state.progressBarNow}/> */}
                <div className='VizMain'>
                    <FaIcons.FaGripLinesVertical className="ResizeViz"
                                                draggable="false"
                                                onMouseEnter={this.cursorResized}
                                                onMouseLeave={this.cursorOrig}
                                                onMouseDown={this.startDrag}
                                                style={{cursor: this.state.cursor_type}}/>
                    <div className='GraphVizHandler'>
                        <div className='GraphVizHeader'>
                            <div className='GraphVizTitle'>
                                {this.props.selectedRun + "/" + this.props.selectedModel + "/" + this.props.selectedPass + "/" + this.props.selectedGraph + "/" + this.props.selectedGraphType}
                            </div>
                            <FaIcons.FaBars className='GraphVizMenuIcon' onClick={this.showMenu}/>
                        </div>

                        {/* <div className='GraphVizView' style={{"display": "grid", "grid-template-columns": `auto ${this.state.menuWidth}px`}}> */}
                        <div className='GraphVizView'>
                            <MyGraphviz {...this.props}
                                    className='Graph'
                                    updateNodes={this.updateNodes}
                                    progressBarChange={this.progressBarChange}
                                    isDragging={this.state.isDragging}
                                    showNodeAttributes={this.showNodeAttributes}/>
                            <this.renderMenu />
                        </div>

                        <Modal show={this.state.showSearchMenu} onHide={this.hideSearchMenu} centered>
                            <Modal.Body>
                                <Select className='Selector' options={this.state.nodes} />
                            </Modal.Body>
                            <Modal.Footer>
                                <Button variant="primary" onClick={this.hideSearchMenu}>
                                    Search
                                </Button>
                            </Modal.Footer>
                        </Modal>

                        {/* <Offcanvas show={this.state.showMenu} onHide={this.hideMenu} placement="end" name="end">
                            <Offcanvas.Header closeButton>
                            <Offcanvas.Title>Offcanvas</Offcanvas.Title>
                            </Offcanvas.Header>
                            <Offcanvas.Body>
                            Some text as placeholder. In real life you can have the elements you
                            have chosen. Like, text, images, lists, etc.
                            </Offcanvas.Body>
                        </Offcanvas> */}
                    </div>
                </div>
            </div>
        );
    }
}
 
export default Viz;