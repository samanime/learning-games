/**
 * Basic live reload script that checks for any script changes and automatically refreshes the page
 * if any changed.
 */
class LiveReload {
    constructor (globs, pingRate = 2000) {
        this.pingAll(pingRate, Array.prototype.map.call(document.querySelectorAll('script, link[rel=stylesheet]'), element => element.src || element.href)
            .concat(document.location.href)
            .filter(path => this.globsToRegex(globs).some(glob => glob.test(path))));        
    }

    globsToRegex(globs) {
        return globs.map(glob => new RegExp(glob.replace(/[^\*]\*[^\*]/g, '[^\/]+').replace(/\*\*/g, '(?:.+/)*') + '$'));
    }

    pingAll(pingRate, paths, previous = {}) {
        Promise.all(paths.map(this.ping)).then(pings =>
            pings.some(ping => previous[ping.path] && JSON.stringify(ping) !== JSON.stringify(previous[ping.path]))
                ? location.reload(false)
                : setTimeout(() => {
                    this.pingAll(pingRate, paths, pings.reduce((previous, ping) => (previous[ping.path] = ping) && previous, {}))
                }, pingRate)
        );
    }

    ping(path) { 
        return fetch(path).then(response => response.text().then(contents => ({
            path,
            contentLength: response.headers.get('content-length'),
            contents
        })));
    }
}

ready(() => { 
    new LiveReload(['game.js', 'engine/**/*.js', 'style.css', '/']); 
});