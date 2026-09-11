/* WanderHawaii activity-grid ranking.
   Keeps gear and equipment rentals out of tour grids, ranks what is left by
   qualityScore, then rotates islands so one island cannot fill the first page.
   Loaded with defer; every caller guards on window.rankTours, so a failed load
   leaves the grid exactly as it was. */
(function (w) {
    var GEAR = /\brentals?\b|\bgear\b|\bequipment\b|\bsnorkel set\b|\bfins\b|\bdry snorkel\b|\bflo?atation devices\b/i;

    w.rankTours = function (tours) {
        var list = (tours || []).filter(function (t) {
            return !GEAR.test(String((t && t.name) || ''));
        });
        if (list.length < 2) return list;

        list.sort(function (a, b) {
            return (b.qualityScore || 0) - (a.qualityScore || 0);
        });

        var byIsland = {}, order = [];
        list.forEach(function (t) {
            var k = String(t.island || 'other').toLowerCase();
            if (!byIsland[k]) { byIsland[k] = []; order.push(k); }
            byIsland[k].push(t);
        });
        if (order.length < 2) return list;

        var out = [], left = list.length;
        while (left > 0) {
            for (var i = 0; i < order.length; i++) {
                var q = byIsland[order[i]];
                if (q.length) { out.push(q.shift()); left--; }
            }
        }
        return out;
    };
})(window);
