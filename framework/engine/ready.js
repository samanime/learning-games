/**
 * Creates a ready() function on the window which will be called
 * when the page is ready to run JavaScript (everything fully loaded).
 */
const readyHandlers = [];
window.ready = handler => {
  readyHandlers.push(handler);
  handleState();
};

document.onreadystatechange = window.handleState = handleState = () => {
    while(['interactive', 'complete'].indexOf(document.readyState) > -1 && readyHandlers.length > 0) {
        (readyHandlers.shift())();
    }
};