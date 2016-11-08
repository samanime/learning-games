/**
 * Config
 */
const IMAGES_PATH = 'images/';
const IMAGES_EXT = '.png';
/* End Config */

class Node {
    constructor() {
        this.children = [];
        this.parent = null;
    }

    onClick({x, y}) { }
    onMouseDown({x, y}) { }
    onMouseUp({x, y}) { }
    onMouseMove({x, y}) { }
    onMouseOut({x, y}) { }
    onMouseEnter({x, y}) { }

    handleMouseEvent({x, y}, onFunc) {
        if (this.children.every(child => !child.hitPoint({x, y}) || child['handleMouseEvent']({x, y}, onFunc)) !== false) {
            return this[`on${onFunc[0].toUpperCase()}${onFunc.slice(1)}`]({x, y});
        }
    }


    addChild(child) {
        child.parent && child.parent.removeChild(child);
        child.parent = this;
        this.childIndex(child) === -1 && this.children.push(child);
    }

    removeChild(child) {
        child.parent = null;
        let index = this.childIndex(child);
        index !== -1 && this.children.splice(index, 1);
    }

    empty() {
        this.children.forEach(child => {
            child.parent = null;
        });
        
        this.children = [];
    }

    childIndex(child) {
        return this.children.indexOf(child);
    }

    insertAt(child, index) {
        index = Math.min(index, this.children.length);
        child.parent && child.parent.removeChild(child);
        child.parent = this;
        this.children.splice(index, 0, child);
    }

    insertBefore(child, before) {
        this.insertAt(child, this.childIndex(before));
    }

    insertAfter(child, after) {
        this.insertAt(child, this.childIndex(after));
    }
}

class Engine extends Node {
    constructor(selector, initialState) {
        super();
        this.keys = {};
        this.container = document.querySelector(selector);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.fps = 24;
        this.containerPadding = 20;
        this.aspectRatio = 16/9;
        this.canvas.width = 1600;
        this.canvas.height = 900;
        this.state = initialState;
        
        this.container.appendChild(this.canvas);
        this.initListeners();

        this.lastTick = Date.now();
        this.tick();
    }

    get scale() {
        return this.canvas.clientWidth / this.canvas.width;
    }

    get width() {
        return this.canvas.width;
    }

    get height() {
        return this.canvas.height;
    }

    initListeners() {
        let createMouseListener = type => event => this.handleMouseEvent({ x: Math.floor(event.offsetX / this.scale), y: Math.floor(event.offsetY / this.scale) }, type);
        let createKeyListener = callback => event => callback({ key: event.key, code: event.code }); 

        this.canvas.onclick = createMouseListener('click');
        this.canvas.onmousedown = createMouseListener('mouseDown');
        this.canvas.onmouseup = createMouseListener('mouseUp');
        this.canvas.onmousemove = createMouseListener('mouseMove');
        this.canvas.onmouseout = createMouseListener('mouseOut');
        this.canvas.onmouseenter = createMouseListener('mouseEnter');

        document.onkeydown = createKeyListener(this.onKeyDown.bind(this));
        document.addEventListener('keydown', createKeyListener(({key, code}) => this.keys[code] = key));

        document.onkeyup = createKeyListener(this.onKeyUp.bind(this));
        document.addEventListener('keyup', createKeyListener(({key, code}) => delete this.keys[code]));

        document.onkeypress = createKeyListener(this.onKeyPress.bind(this));

        window.onblur = () => this.onBlur();
        window.addEventListener('blur', () => this.keys = {});

        window.onfocus = () => this.onFocus();
    }

    setBaseSize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.aspectRatio = width / height;
        this.ctx = this.canvas.getContext('2d');
        this.render();
    }

    tick() {
        const now = Date.now();

        this.scaleCanvas();
        this.onTick(now - this.lastTick);
        this.lastTick = now;

        this.render();
        setTimeout(() => this.tick(), 1000 / this.fps);
    }

    changeState(state) {
        const oldState = this.state;
        this.state = state;
        this.onStateChange(state, oldState);
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.children.forEach(child => child.render(this.ctx));
    }

    onTick() { }
    onStateChange(state, oldState) { }

    onKeyDown({key, code}) { }
    onKeyUp({key, code}) { }
    onKeyPress({key, code}) { }

    onBlur() { }
    onFocus() { }

    scaleCanvas() {
        let maxWidth = this.container.clientWidth - this.containerPadding * 2,
            maxHeight = this.container.clientHeight - this.containerPadding * 2,
            widthHeight = Math.floor(maxWidth / this.aspectRatio),
            heightWidth = Math.floor(maxHeight * this.aspectRatio),
            sizes = [
                [maxWidth, widthHeight],
                [heightWidth, maxHeight]
            ],
            size = sizes.reduce((largestSize, size) => (!(size[0] <= maxWidth && size[1] <= maxHeight) && largestSize)
                || (!largestSize && size)
                || (size[0] >= largestSize[0] && size[1] >= largestSize[1]), null);

        if (this.canvas.width != size[0] || this.canvas.height != size[1]) {
            this.canvas.style = `width: ${size[0]}px; height: ${size[1]}`;
            this.render();
        }
    }
}

class Sprite extends Node {
    constructor(x = 0, y = 0) {
        super();
        this.x = x;
        this.y = y;
        this.alpha = 1.0;
        this.scale = 1.0;
        this.angle = 0; // degrees
        this.originOffsetX = 0;
        this.originOffsetY = 0;
        this.showHitbox = false;
        this.hide = false;

        this.parent = null;
        this.children = [];
    }

    get originX() {
        return this.canvasX + this.width / 2 + this.originOffsetX;
    }

    get originY() {
        return this.canvasY + this.height / 2 + this.originOffsetY;
    }

    get canvasX() {
        return this.x + (this.parent && this.parent.canvasX || 0);
    }

    get canvasY() {
        return this.y + (this.parent && this.parent.canvasY || 0);
    }

    renderHitBox(ctx) {
        let hitbox = this.hitbox;
        ctx.save();
        ctx.fillStyle = '#0F0';
        ctx.fillRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
        ctx.restore();
    }

    render(ctx) {
        this.preRender(ctx);
        this.showHitBox && this.renderHitBox(ctx);
        !this.hide && this.doRender(ctx);
        this.postRender(ctx);
    }

    get hitbox() {
        let topLeft = this.rotatePoint(this.canvasX, this.canvasY, this.originX, this.originY, this.angle, this.scale),
            topRight = this.rotatePoint(this.canvasX + this.width, this.canvasY, this.originX, this.originY, this.angle, this.scale),
            bottomLeft = this.rotatePoint(this.canvasX, this.canvasY + this.height, this.originX, this.originY, this.angle, this.scale),
            bottomRight = this.rotatePoint(this.canvasX + this.width, this.canvasY + this.height, this.originX, this.originY, this.angle, this.scale),
            x = Math.min(topLeft.x, bottomLeft.x, topRight.x, bottomRight.x),
            y = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);

        return {
            x,
            y,
            width: Math.max(topLeft.x, bottomLeft.x, topRight.x, bottomRight.x) - x,
            height: Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y) - y
        };
    }

    rotatePoint(pointX, pointY, originX, originY, angle, scale) {
        angle = angle * Math.PI / 180.0;
        pointX -= (1-scale) * (pointX-originX);
        pointY -= (1-scale) * (pointY-originY);
        return {
            x: Math.cos(angle) * (pointX-originX) - Math.sin(angle) * (pointY-originY) + originX,
            y: Math.sin(angle) * (pointX-originX) + Math.cos(angle) * (pointY-originY) + originY
        };
    }

    preRender(ctx) {
        let rad = this.angle * Math.PI / 180;

        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.originX, this.originY);
        ctx.scale(this.scale, this.scale);
        ctx.rotate(rad);
        ctx.translate(-this.originX, -this.originY);
    }

    postRender(ctx) {
        this.children.forEach(child => child.render(ctx));
        ctx.restore();
    }

    hitRect(sprite) {
        let a = this.hitbox,
            b = sprite.hitbox,
            o = { 
                left: Math.max(a.x, b.x), 
                right: Math.min(a.x + a.width, b.x + b.width), 
                top: Math.max(a.y, b.y), 
                bottom: Math.min(a.y + a.height, b.y + b.height) 
            };

        return (o.left < o.right && o.top < o.bottom) 
            && {
                x: o.left,
                y: o.top,
                width: o.right - o.left,
                height: o.bottom - o.top
            } || {x: 0, y: 0, width: 0, height: 0};
    } 

    hitPoint({x, y}) {
        const hitbox = this.hitbox;
        return hitbox.x <= x && hitbox.x + hitbox.width >= x
            && hitbox.y <= y && hitbox.y + hitbox.height >= y;
    }
}

class CircleSprite extends Sprite {
    constructor(x = 0, y = 0, radius = 0) {
        super(x, y);
        this.radius = radius;
        this.fill = '#FFF';
        this.border = '#000';
        this.borderWidth = 1;
    }

    get width() {
        return this.radius * 2;
    }

    get height() {
        return this.radius * 2;
    }

    doRender(ctx) {
        ctx.fillStyle = this.fill;
        ctx.strokeStyle = this.border;
        ctx.lineWidth = this.borderWidth;
        ctx.beginPath();
        ctx.arc(this.x + this.radius, this.y + this.radius, this.radius, Math.PI * 2, 0);
        ctx.closePath();
        this.fill && ctx.fill();
        this.border && this.borderWidth && ctx.stroke();
    }
}

class RectSprite extends Sprite {
    constructor(x = 0, y = 0, width = 0, height = 0) {
        super(x, y);
        this.width = width;
        this.height = height;
        this.fill = '#FFF';
        this.border = '#000';
        this.borderWidth = 1;
    }

    doRender(ctx) {
        ctx.fillStyle = this.fill;
        ctx.strokeStyle = this.border;
        ctx.lineWidth = this.borderWidth;
        this.fill && ctx.fillRect(this.canvasX, this.canvasY, this.width, this.height);
        this.border && this.borderWidth && ctx.strokeRect(this.canvasX, this.canvasY, this.width, this.height);
    }
}

class ImageSprite extends Sprite {
    constructor(image, x = 0, y = 0) {
        super(x, y);
        this.imageName = image;
        this.image = document.createElement('img');
        this.loaded = false;

        this.image.src = IMAGES_PATH + image + IMAGES_EXT;
        this.image.onload = () => this.loaded = true;
        this.image.width > 0 && (this.loaded = true);
    }

    clone() {
        let cloned = new ImageSprite(this.imageName, this.x, this.y);
        cloned.scale = this.scale;
        cloned.angle = this.angle;
        cloned.alpha = this.alpha;
        return cloned;
    }

    get width() {
        return this.image.width;
    }

    get height() {
        return this.image.height;
    }

    doRender(ctx) {
        this.loaded && ctx.drawImage(this.image, this.canvasX, this.canvasY, this.image.width, this.image.height);
    }

    static create(image, x = 0, y = 0) {
        return new Promise(resolve => {
            let sprite = new ImageSprite(image, x, y);
            sprite.image.addEventListener('load', () => resolve(sprite));
            sprite.image.width > 0 && resolve(sprite);
        }); 
    }   
}

class TextSprite extends Sprite {
    constructor(text = '', x = 0, y = 0) {
        super(x, y);
        this.text = text;
        this.font = 'Arial';
        this.size = '30px';
        this.color = '#000000';
        this.align = 'left';
        this.baseline = 'middle';
        this.width = 0;
        this.height = 0;
    }

    doRender(ctx, x = 0, y = 0) {
        if (this.width > 0 || this.height > 0) {
            ctx.beginPath();
            ctx.rect(this.canvasX, this.canvasY, this.width || 10000, this.height || 10000);
            ctx.clip();
            ctx.closePath();
        }

        ctx.font = this.size + ' ' + this.font;
        ctx.textAlign = this.align;
        ctx.fillStyle = this.color;
        ctx.textBaseline = this.baseline;
        ctx.fillText(this.text, this.canvasX, this.canvasY);
    }
}

class TextButtonSprite extends RectSprite {
    constructor(text = '', x = 0, y = 0, width = 0, height = 0) {
        super(x, y, width, height);
        this.text = new TextSprite(text, width / 2, height / 2);
        this.text.align = 'center';
        this.addChild(this.text);
    }
}