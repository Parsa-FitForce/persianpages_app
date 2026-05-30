// CloudFront Function (viewer-request): 301-redirect www.persianpages.com → persianpages.com.
// Serving identical content at both hosts caused Google to treat every URL as a duplicate
// and de-index the site even though rel="canonical" pointed at apex.
function handler(event) {
  var request = event.request;
  var host = request.headers.host && request.headers.host.value;
  if (!host || host.indexOf('www.') !== 0) return request;

  var apex = host.slice(4);

  var qs = '';
  var keys = Object.keys(request.querystring);
  if (keys.length > 0) {
    var parts = [];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var v = request.querystring[k];
      var encKey = encodeURIComponent(k);
      if (v.multiValue) {
        for (var j = 0; j < v.multiValue.length; j++) {
          parts.push(encKey + '=' + encodeURIComponent(v.multiValue[j].value));
        }
      }
      parts.push(encKey + '=' + encodeURIComponent(v.value));
    }
    qs = '?' + parts.join('&');
  }

  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: {
      'location': { value: 'https://' + apex + request.uri + qs }
    }
  };
}
