const cacheFetch = (request, permanent = false, cachingDuration = 30) => {
    if (!window.caches)
        return fetch(request);

    window.alojiCache = window.alojiCache ||
    ({
        promises: {},
        caches: {
            cache: {
                name: '',
                values: {},
                match: function (request) {
                    var r = this.values[request]
                        ? this.values[request].clone() : null;
                    return Promise.resolve(r)
                },
                put: function (request, response) {
                    this.values[request] = response;
                    return Promise.resolve()
                }
            },
            open: function (n) {
                this.cache.name = n;
                return Promise.resolve(this.cache)
            }
        }
    });

    const caches = (!window.caches || !permanent)
        ? window.fxsCache.caches : window.caches;

    return caches
        .open('aloji')
        .then((cache) => {
            return cache
                .match(request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        const expirationDate = Date.parse(
                            cachedResponse.headers.get('aloji-cache-expires'));
                        if (expirationDate > new Date()) {
                            console.log('Found response in cache:', cachedResponse);
                            return cachedResponse;
                        }
                    }
                    if (!alojiCache.promises[request]) {
                        console.log('Fetching request from the network');

                        alojiCache.promises[request] = fetch(request)
                            .then((response) => {
                                const expires = new Date();
                                expires.setSeconds(
                                    expires.getSeconds() + cachingDuration,
                                );
                                const cachedFields = {
                                    status: response.status,
                                    statusText: response.statusText,
                                    headers: { 'aloji-cache-expires': expires.toUTCString() },
                                };
                                response.headers.forEach((v, k) => {
                                    cachedFields.headers[k] = v;
                                });

                                const respClone = response.clone();
                                return response.blob().then((body) => {
                                    return cache.put(request, new Response(body, cachedFields))
                                        .then(() => {
                                            delete alojiCache.promises[request];

                                            const jsonBody = respClone.json();
                                            respClone.json = () => jsonBody;
                                            return respClone;
                                        });
                                });
                            });
                    }
                    return alojiCache.promises[request];
                });
        });
};