import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.css'
import './MenuItems.css'

class MenuItems extends Component {
    render() { 
        if (!this.props.is_active) {
            return (<></>);
        }
        return (
            <div className="MenuItems">
                <ul className='list-group'>
                    {Object.keys(this.props.items).map(item =>
                        <li key={item} className='list-group-item pass-item' onClick={() => this.props.select_item({name: item})}>
                            {item}
                            <this.props.label {...this.props.items[item]}/>
                        </li>
                    )}
                </ul>
            </div>
        );
    }
}
 
export default MenuItems;