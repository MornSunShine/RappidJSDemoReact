/*! Rappid v3.2.0 - HTML5 Diagramming Framework - TRIAL VERSION

Copyright (c) 2015 client IO

 2020-07-25 


This Source Code Form is subject to the terms of the Rappid Trial License
, v. 2.0. If a copy of the Rappid License was not distributed with this
file, You can obtain one at http://jointjs.com/license/rappid_v2.txt
 or from the Rappid archive as was distributed by client IO. See the LICENSE file.*/


import { dia, shapes, util } from '@clientio/rappid';

import RappidService from 'src/services/rappid.service';
import { Controller, SharedEvents } from 'src/rappid/controller';
import * as actions from 'src/rappid/actions';
import { actionCreator } from '../../redux/helpers/actionCreator';

const DEBOUNCE_TIME_MS = 500;
const MOUSEWHEEL_DELTA_THROTTLE = 0.2;

export class RappidController extends Controller {

    startListening() {

        const { graph, paper, toolbar } = this.service;

        this.listenTo(graph, {
            'add': onCellAdd,
            'remove': onCellRemove,
            'change:ports': onElementPortsChange,
            'change add remove': util.debounce(onGraphChange, DEBOUNCE_TIME_MS),
        });

        this.listenTo(paper, {
            'cell:mousewheel': onPaperCellMousewheel,
            'blank:mousewheel': onPaperBlankMousewheel,
            'blank:pointerdown': onPaperBlankPointerdown,
            'cell:pointerup': onPaperCellPointerup,
            'cell:tool:remove': onPaperCellToolRemove,
            'element:pointermove': onPaperElementPointermove,
            'element:pointerup': onPaperElementPointerup,
            'element:port:add': onPaperElementPortAdd,
            'element:port:remove': onPaperElementPortRemove,
            'scale': onPaperScale
        });

        this.listenTo(toolbar, {
            'png:pointerclick': onToolbarPNGPointerclick
        });
    }
}

// Event Bus Service

export function onGraphStartBatch(service: RappidService, batchName: string): void {
    const { graph } = service;
    graph.startBatch(batchName);
}

export function onGraphStopBatch(service: RappidService, batchName: string): void {
    const { graph } = service;
    graph.stopBatch(batchName);
}

// Graph

function onCellAdd(service: RappidService, cell: dia.Cell): void {
    if (cell.isLink()) return;
    actions.setSelection(service, [cell]);
    actions.updateLinksRouting(service);
}

function onCellRemove(service: RappidService, removedCell: dia.Cell): void {
    const { selection } = service;
    if (!selection.includes(removedCell)) return;
    actions.setSelection(service, selection.filter(cell => cell !== removedCell));
    if (removedCell.isElement()) {
        actions.updateLinksRouting(service);
    }
}

function onElementPortsChange(_service: RappidService, message: shapes.app.Message): void {
    message.toggleAddPortButton('out');
}

function onGraphChange(service: RappidService): void {
    const { graph, dispatch } = service;
    dispatch(actionCreator(SharedEvents.GRAPH_CHANGED, graph.toJSON()));
}

// Paper

function onPaperBlankPointerdown(service: RappidService, evt: dia.Event): void {
    const { scroller } = service;
    actions.setSelection(service, []);
    scroller.startPanning(evt);
}

function onPaperBlankMousewheel(service: RappidService, evt: dia.Event, x: number, y: number, delta: number): void {
    evt.preventDefault();
    actions.zoomAtPoint(service, delta * MOUSEWHEEL_DELTA_THROTTLE, x, y);
}

function onPaperCellMousewheel(
    service: RappidService, _cellView: dia.CellView, evt: dia.Event, x: number, y: number, delta: number
): void {
    evt.preventDefault();
    actions.zoomAtPoint(service, delta * MOUSEWHEEL_DELTA_THROTTLE, x, y);
}

function onPaperCellPointerup(service: RappidService, cellView: dia.CellView): void {
    actions.setSelection(service, [cellView.model]);
}

function onPaperElementPointermove(service: RappidService, elementView: dia.ElementView, evt: dia.Event): void {
    const { paper } = service;
    const { data } = evt;
    // Run the code below on the first `pointermove` event only
    if (data.pointermoveCalled) return;
    data.pointermoveCalled = true;
    paper.hideTools();
}

function onPaperElementPointerup(service: RappidService, _elementView: dia.ElementView, evt: dia.Event): void {
    const { paper } = service;
    const { data } = evt;
    if (!data.pointermoveCalled) return;
    paper.showTools();
    actions.updateLinksRouting(service);
}

function onPaperElementPortAdd(_service: RappidService, elementView: dia.ElementView, evt: dia.Event): void {
    evt.stopPropagation();
    const message = elementView.model as shapes.app.Message;
    message.addDefaultPort();
}

function onPaperElementPortRemove(_service: RappidService, elementView: dia.ElementView, evt: dia.Event): void {
    evt.stopPropagation();
    const portId = elementView.findAttribute('port', evt.target);
    const message = elementView.model as shapes.app.Message;
    message.removePort(portId);
}

function onPaperCellToolRemove(_service: RappidService, cellView: dia.CellView, evt: dia.Event): void {
    cellView.model.remove();
}

function onPaperScale(service: RappidService): void {
    const { tooltip } = service;
    tooltip.hide();
}

// Toolbar

function onToolbarPNGPointerclick(service: RappidService): void {
    actions.exportToPNG(service);
}
