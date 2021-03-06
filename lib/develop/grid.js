/**
 * Visual grid with cursor.
 *
 * @module stb/develop/grid
 * @author Stanislav Kalashnik <darkpark.main@gmail.com>
 * @license GNU GENERAL PUBLIC LICENSE Version 3
 */

'use strict';

var app     = require('spa-app/lib/core'),
    metrics = app.metrics;
    //storage = require('./storage');

// public
module.exports = window.grid = {

    /** @type {HTMLElement} */
    $canvas: null,

    /** @type {CanvasRenderingContext2D} */
    ctx: null,

    lineWidth: 1,

    // content middle point
    centerX: 0,
    centerY: 0,

    // last click point
    lastX: 0,
    lastY: 0,

    // mouse pointer
    cursorX: 0,
    cursorY: 0,

    // list of click points
    points: JSON.parse(app.develop.storage.getItem('grid.points') || '[]'),

    // points to snap
    snaps: [],

    // visible or not
    active: false,


    init: function () {
        // current execution context
        var self = this;

        this.$canvas = document.body.appendChild(document.createElement('canvas'));
        this.ctx = this.$canvas.getContext('2d');

        // apply size
        this.ctx.canvas.width  = metrics.width;
        this.ctx.canvas.height = metrics.height;

        // safe zone center
        this.centerX = metrics.availWidth  / 2 + metrics.availLeft;
        this.centerY = metrics.availHeight / 2 + metrics.availTop;

        this.snaps.push({x: metrics.availLeft,  y: metrics.availTop});
        this.snaps.push({x: metrics.width - metrics.availRight, y: metrics.height - metrics.availBottom});
        this.snaps.push({x: this.centerX, y: this.centerY});

        this.ctx.lineWidth = this.lineWidth;
        this.ctx.font = '14px Ubuntu';

        this.$canvas.addEventListener('contextmenu', function ( event ) {
            event.preventDefault();
        });

        this.$canvas.addEventListener('mousedown', function ( event ) {
            self.mousedown(event);
        });

        this.$canvas.addEventListener('mousemove', function ( event ) {
            self.mousemove(event);
        });
    },


    mousemove: function ( event ) {
        // current execution context
        var self = this;

        this.cursorX = event.x;
        this.cursorY = event.y;

        this.repaint();

        if ( event.shiftKey ) {
            // snap to the point divisible by 10
            this.cursorX = Math.round(event.x / 10) * 10;
            this.cursorY = Math.round(event.y / 10) * 10;
        } else if ( !event.ctrlKey ) {
            // snap to the nearest line
            this.points.concat(this.snaps).some(function ( point ) {
                if ( Math.abs(point.x - self.cursorX) <= 10 ) {
                    self.cursorX = point.x;
                }
                if ( Math.abs(point.y - self.cursorY) <= 10 ) {
                    self.cursorY = point.y;
                }
            });
        }

        this.drawPointer();
    },


    mousedown: function ( event ) {
        var matchPoint = null,
            self       = this,  // current execution context
            point;

        // all clicked crosses
        this.points.forEach(function ( point ) {
            if ( self.cursorX === point.x && self.cursorY === point.y ) {
                matchPoint = point;
            }
        });

        if ( event.button === 0 ) {
            // left mouse button
            if ( matchPoint === null ) {
                this.points.push({x: this.cursorX, y: this.cursorY});
            }
            this.lastX = this.cursorX;
            this.lastY = this.cursorY;
        } else if ( event.button === 1 ) {
            // middle mouse button
            this.points.pop();
            point = this.points[this.points.length - 1];
            if ( point ) {
                this.lastX = point.x;
                this.lastY = point.y;
            } else {
                this.lastX = 0;
                this.lastY = 0;
            }
        } else if ( event.button === 2 ) {
            // right mouse button
            if ( matchPoint === null ) {
                this.lastX = 0;
                this.lastY = 0;
            } else {
                this.points.splice(this.points.indexOf(matchPoint), 1);
                point = this.points[this.points.length - 1];
                if ( point ) {
                    this.lastX = point.x;
                    this.lastY = point.y;
                } else {
                    this.lastX = 0;
                    this.lastY = 0;
                }
            }
        }
        this.repaint();
        this.drawPointer();
        app.develop.storage.setItem('grid.points', JSON.stringify(this.points));
    },


    show: function () {
        this.active = true;
        this.$canvas.classList.add('active');
        this.repaint();
    },


    hide: function () {
        this.active = false;
        this.$canvas.classList.remove('active');
    },


    repaint: function () {
        var ctx  = this.ctx,
            self = this;  // current execution context

        // remove all
        ctx.clearRect(0, 0, metrics.width, metrics.height);

        // safe zone center
        this.drawCross({x: this.centerX, y: this.centerY}, {color: 'grey'});

        // draw safe zone borders
        ctx.strokeStyle = 'red';
        ctx.strokeRect(metrics.availLeft + 0.5, metrics.availTop + 0.5, metrics.availWidth, metrics.availHeight);

        // all clicked crosses
        this.points.forEach(function ( point ) {
            self.drawCross(point, {color: 'green', mark: 3});
        });
    },


    drawPointer: function () {
        var ctx    = this.ctx,
            height = 16,
            width, dx, dy, angle, title;

        title = this.cursorX + ' : ' + this.cursorY;

        // there were some clicks
        if ( this.lastX || this.lastY ) {
            // distance by X and Y from last point
            dx = this.cursorX - this.lastX;
            dy = this.cursorY - this.lastY;
            title = title + ' [' + (dx > 0 ? '+' : '') + dx + ', ' + (dy > 0 ? '+' : '') + dy + ']';

            // angle of the line connecting the cursor and the last point
            angle = Math.atan2(dy, dx) * 180 / Math.PI;
            title = title + ' ' + angle.toFixed(2) + '°';

            // not perpendicular
            if ( dx && dy ) {
                // distance between the cursor and the last point
                title = title + ' len: ' + Math.sqrt(Math.pow(Math.abs(dx), 2) + Math.pow(Math.abs(dy), 2)).toFixed(2);
            }

            // angle line
            ctx.beginPath();
            // show by color if 45°
            ctx.strokeStyle = [-135, 135, -45, 45].indexOf(angle) === -1 ? 'grey' : 'yellow';
            ctx.moveTo(this.lastX, this.lastY);
            ctx.lineTo(this.cursorX, this.cursorY);
            ctx.stroke();
        }

        // pointer itself
        this.drawCross({x: this.cursorX, y: this.cursorY});

        title = ' ' + title + ' ';
        width = ctx.measureText(title).width;

        // title background
        ctx.fillStyle = 'yellow';
        ctx.fillRect(
            this.cursorX > this.centerX ? this.cursorX - width  : this.cursorX,
            this.cursorY > this.centerY ? this.cursorY - height : this.cursorY,
            width, height
        );

        // title itself
        ctx.fillStyle    = 'black';
        ctx.textBaseline = this.cursorY > this.centerY ? 'bottom' : 'top';
        ctx.textAlign    = this.cursorX > this.centerX ? 'right'  : 'left';
        ctx.fillText(title, this.cursorX, this.cursorY);
    },


    drawCross: function ( point, options ) {
        var ctx = this.ctx;

        // defaults
        options = options || {};

        // apply style options
        ctx.lineWidth   = options.width || this.lineWidth;
        ctx.strokeStyle = options.color || 'yellow';

        ctx.beginPath();
        // horizontal line
        ctx.moveTo(0, point.y + 0.5);
        ctx.lineTo(metrics.width, point.y + 0.5);
        // vertical line
        ctx.moveTo(point.x + 0.5, 0);
        ctx.lineTo(point.x + 0.5, metrics.height);
        // draw
        ctx.stroke();

        // center mark
        if ( options.mark ) {
            ctx.lineWidth = 3;
            ctx.beginPath();
            // horizontal line
            ctx.moveTo(point.x - options.mark + 0.5, point.y + 0.5);
            ctx.lineTo(point.x + options.mark + 0.5, point.y + 0.5);
            // vertical line
            ctx.moveTo(point.x + 0.5, point.y - options.mark + 0.5);
            ctx.lineTo(point.x + 0.5, point.y + options.mark + 0.5);
            // draw
            ctx.stroke();
            ctx.lineWidth = this.lineWidth;
        }
    }

};
