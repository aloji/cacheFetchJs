const cacheFetch = (request, cachingDuration) => {
    if (!window.caches)
        return fetch(request);

    window.aloji = window.aloji || {
        promises: {}
    };

    cachingDuration = cachingDuration || 30;

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
                    if (!aloji.promises[request]) {
                        console.log('Fetching request from the network');

                        aloji.promises[request] = fetch(request)
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
                                            delete aloji.promises[request];

                                            const jsonBody = respClone.json();
                                            respClone.json = () => jsonBody;
                                            return respClone;
                                        });
                                });
                            });
                    }
                    return aloji.promises[request];
                });
        });
};