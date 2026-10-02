/*  ============================================================================
    build_origin_story.jsx
    Builds the "Origin Story" vertical motion-graphics project (1080x1920, 30fps)
    Run in After Effects:  File > Scripts > Run Script File...
    Keep voiceover.mp3 in the same folder as this script.

    TIMING (measured with ffmpeg silencedetect on voiceover.mp3, -35dB / 0.3s,
    refined with word-gap detection at -28dB / 0.06s). Duration 48.20s.
      01 Village    0.07s   "I grew up in a small village in Telangana..."
      02 Spark     10.13s   "I was curious about how things worked..."
      03 Leap      21.25s   "Then I crossed an ocean..."
      04 Becoming  31.83s   "I taught machines to think..."
      05 Close     42.42s   "From a village in Telangana to the frontier of AI..."
      VO ends      48.02s   -> comp = audio length + 2s tail
    All beat times live in the B object below - nudge them there.
    ============================================================================ */

(function buildOriginStory() {

    // ------------------------------------------------------------------ CONFIG
    var W = 1080, H = 1920, FPS = 30, TAIL = 2.0;
    var FONT_OVERRIDE = "";            // e.g. "Montserrat-ExtraBold" (PostScript name). Blank = auto-pick.
    var EASE_INFLUENCE = 70;           // easy-ease influence applied to every keyframe

    var CYAN   = [0, 229 / 255, 1];          // #00E5FF hero
    var GOLD   = [1, 184 / 255, 0];          // #FFB800 secondary
    var BLACK  = [0.035, 0.035, 0.04];       // matte black
    var WHITE  = [0.94, 0.98, 1];
    var CORE   = [0.85, 1, 1];               // particle core (white-cyan)
    var DIMCY  = [0, 0.22, 0.26];            // unlit node

    // Beat sheet (seconds, absolute comp time) - from ffmpeg analysis
    var B = {
        L1: 0.07, telangana: 1.45, noSkyline: 2.73, noTowers: 3.96, openSky: 5.44,
        L2: 10.13, curious: 10.45, howThings: 11.41, codeBeat: 12.06, curiosity: 12.75,
        followed: 15.20, engineering: 16.68, nights: 17.89, door: 19.03, cracked: 20.10, doorEnter: 20.78,
        L3: 21.25, ocean: 22.20, masters: 23.25, arcEnd: 25.38, country: 24.46, language: 25.59,
        everything: 27.50, bigger: 28.26, faster: 28.95, harder: 29.69, keptGoing: 30.55,
        L4: 31.83, today: 33.68, buildAI: 34.21, reason: 35.40, create: 36.84, kid: 38.61, answer: 40.50,
        L5: 42.42, name: 45.00, beginning: 46.47, pulse: 47.30, voEnd: 48.02
    };
    var VO_FALLBACK_DUR = 48.196;

    var SCENES = [
        { id: "01", name: "Village",  start: B.L1, line: "I grew up in a small village in Telangana." },
        { id: "02", name: "Spark",    start: B.L2, line: "I was curious about how things worked." },
        { id: "03", name: "Leap",     start: B.L3, line: "Then I crossed an ocean." },
        { id: "04", name: "Becoming", start: B.L4, line: "I taught machines to think." },
        { id: "05", name: "Close",    start: B.L5, line: "From a village in Telangana to the frontier of AI." }
    ];

    var WARN = [];
    var FONT = "Arial-BoldMT";

    // ================================================================ HELPERS
    function c4(c) { return [c[0], c[1], c[2], 1]; }
    function snap(t) { return Math.max(0, Math.round(t * FPS) / FPS); }
    function K(p, t, v) { p.setValueAtTime(snap(t), v); }
    function S3(v) { return [v, v, 100]; }
    function S2(v) { return [v, v]; }
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function rng(seed) { var s = seed; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
    function zeroT(n) { var a = []; for (var i = 0; i < n; i++) a.push([0, 0]); return a; }
    function xf(l, m) { return l.property("ADBE Transform Group").property(m); }

    function pickFont() {
        if (FONT_OVERRIDE) return FONT_OVERRIDE;
        var c = ["Montserrat-ExtraBold", "Montserrat-Bold", "Inter-ExtraBold", "Inter-Bold", "Poppins-Bold",
                 "HelveticaNeue-Bold", "Helvetica-Bold", "SegoeUI-Bold", "Arial-BoldMT"];
        try {
            if (app.fonts && app.fonts.getFontsByPostScriptName) {
                for (var i = 0; i < c.length; i++) {
                    var r = app.fonts.getFontsByPostScriptName(c[i]);
                    if (r && r.length) return c[i];
                }
            }
        } catch (e) {}
        return "Arial-BoldMT";
    }

    // smooth (Catmull-Rom style) tangents through points
    function smooth(pts, tension) {
        tension = tension || 1;
        var inT = [], outT = [], n = pts.length;
        for (var i = 0; i < n; i++) {
            var p0 = pts[Math.max(0, i - 1)], p2 = pts[Math.min(n - 1, i + 1)];
            var tx = (p2[0] - p0[0]) / 6 * tension, ty = (p2[1] - p0[1]) / 6 * tension;
            inT.push([-tx, -ty]); outT.push([tx, ty]);
        }
        return { inT: inT, outT: outT };
    }

    function ellipseShape(cx, cy, rx, ry) {
        var k = 0.5523, s = new Shape();
        s.vertices = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
        s.inTangents = [[-rx * k, 0], [0, -ry * k], [rx * k, 0], [0, ry * k]];
        s.outTangents = [[rx * k, 0], [0, ry * k], [-rx * k, 0], [0, -ry * k]];
        s.closed = true;
        return s;
    }

    // ---- effects
    function addFx(layer, matchName, fxName) {
        var f = layer.property("ADBE Effect Parade").addProperty(matchName);
        if (fxName) f.name = fxName;
        return f;
    }
    function fxProp(layer, fxName, keys) {
        var f = layer.property("ADBE Effect Parade").property(fxName);
        for (var i = 0; i < keys.length; i++) { var p = null; try { p = f.property(keys[i]); } catch (e) {} if (p) return p; }
        WARN.push(layer.name + " > " + fxName + " > " + keys[keys.length - 1]);
        return null;
    }
    function setFx(f, keys, val, isExpr) {
        for (var i = 0; i < keys.length; i++) {
            var p = null; try { p = f.property(keys[i]); } catch (e) {}
            if (p) { try { if (isExpr) p.expression = val; else p.setValue(val); return p; } catch (e2) {} }
        }
        WARN.push(f.name + " > " + keys[keys.length - 1]);
        return null;
    }
    function addGlow(layer, col, radius, intensity, threshold, name) {
        var g = addFx(layer, "ADBE Glo2", name || "Glow");
        setFx(g, ["ADBE Glo2-0002", "Glow Threshold"], threshold == null ? 35 : threshold);
        setFx(g, ["ADBE Glo2-0003", "Glow Radius"], radius);
        setFx(g, ["ADBE Glo2-0004", "Glow Intensity"], intensity);
        setFx(g, ["ADBE Glo2-0007", "Glow Colors"], 2);                 // A & B Colors
        setFx(g, ["ADBE Glo2-0012", "Color A"], c4(col));
        setFx(g, ["ADBE Glo2-0013", "Color B"], c4([col[0] * 0.6, col[1] * 0.6, col[2] * 0.6]));
        return g;
    }
    function addBlur(layer, amount, name) {
        var b = addFx(layer, "ADBE Gaussian Blur 2", name || "Blur");
        setFx(b, ["ADBE Gaussian Blur 2-0001", "Blurriness"], amount);
        try { b.property("ADBE Gaussian Blur 2-0003").setValue(1); } catch (e) {}
        return b;
    }
    function blurProp(layer, name) { return fxProp(layer, name, ["ADBE Gaussian Blur 2-0001", "Blurriness"]); }

    // ---- shape layers (layer anchor [0,0] + position [0,0] => paths are in comp space)
    function shapeLayer(comp, name, pos) {
        var l = comp.layers.addShape();
        l.name = name;
        xf(l, "ADBE Anchor Point").setValue([0, 0]);
        xf(l, "ADBE Position").setValue(pos || [0, 0]);
        return l;
    }
    function rootV(l) { return l.property("ADBE Root Vectors Group"); }
    function grp(l, g) { return rootV(l).property(g); }
    function gv(l, g) { return grp(l, g).property("ADBE Vectors Group"); }
    function gt(l, g) { return grp(l, g).property("ADBE Vector Transform Group"); }
    function newGroup(l, g) { var G = rootV(l).addProperty("ADBE Vector Group"); G.name = g; return g; }

    function addPathTo(l, g, verts, inT, outT, closed) {
        var p = gv(l, g).addProperty("ADBE Vector Shape - Group");
        var s = new Shape();
        s.vertices = verts;
        s.inTangents = inT || zeroT(verts.length);
        s.outTangents = outT || zeroT(verts.length);
        s.closed = !!closed;
        p.property("ADBE Vector Shape").setValue(s);
    }
    function addEllipseTo(l, g, size, pos) {
        var e = gv(l, g).addProperty("ADBE Vector Shape - Ellipse");
        e.property("ADBE Vector Ellipse Size").setValue([size, size]);
        if (pos) e.property("ADBE Vector Ellipse Position").setValue(pos);
    }
    function addRectTo(l, g, size, pos, round) {
        var r = gv(l, g).addProperty("ADBE Vector Shape - Rect");
        r.property("ADBE Vector Rect Size").setValue(size);
        if (pos) r.property("ADBE Vector Rect Position").setValue(pos);
        if (round) r.property("ADBE Vector Rect Roundness").setValue(round);
    }
    function addStrokeTo(l, g, col, w, op) {
        var s = gv(l, g).addProperty("ADBE Vector Graphic - Stroke");
        s.property("ADBE Vector Stroke Color").setValue(c4(col));
        s.property("ADBE Vector Stroke Width").setValue(w);
        s.property("ADBE Vector Stroke Opacity").setValue(op == null ? 100 : op);
        try { s.property("ADBE Vector Stroke Line Cap").setValue(2); s.property("ADBE Vector Stroke Line Join").setValue(2); } catch (e) {}
    }
    function addFillTo(l, g, col, op) {
        var f = gv(l, g).addProperty("ADBE Vector Graphic - Fill");
        f.property("ADBE Vector Fill Color").setValue(c4(col));
        f.property("ADBE Vector Fill Opacity").setValue(op == null ? 100 : op);
    }
    function addTrimTo(l, g, st, en) {
        var t = gv(l, g).addProperty("ADBE Vector Filter - Trim");
        t.property("ADBE Vector Trim Start").setValue(st);
        t.property("ADBE Vector Trim End").setValue(en);
    }
    function trimP(l, g, which) {
        return gv(l, g).property("ADBE Vector Filter - Trim").property(which === "start" ? "ADBE Vector Trim Start" : "ADBE Vector Trim End");
    }
    function strokeP(l, g, m) { return gv(l, g).property("ADBE Vector Graphic - Stroke").property(m); }
    function fillP(l, g, m) { return gv(l, g).property("ADBE Vector Graphic - Fill").property(m); }

    // ---- text
    function addText(comp, name, str, size, col, pos, tracking, maxW) {
        var l = comp.layers.addText(str);
        l.name = name;
        var sp = l.property("ADBE Text Properties").property("ADBE Text Document");
        var d = sp.value;
        try { d.resetCharStyle(); d.resetParagraphStyle(); } catch (e) {}
        d.text = str;
        try { d.font = FONT; } catch (eF) { WARN.push(name + ": font " + FONT); }
        d.fontSize = size;
        d.applyFill = true;
        d.fillColor = col;
        d.applyStroke = false;
        d.tracking = tracking || 0;
        d.justification = ParagraphJustification.CENTER_JUSTIFY;
        sp.setValue(d);
        var r = l.sourceRectAtTime(0, false);
        if (maxW && r.width > maxW) {
            d = sp.value; d.fontSize = size * maxW / r.width; sp.setValue(d);
            r = l.sourceRectAtTime(0, false);
        }
        xf(l, "ADBE Anchor Point").setValue([r.left + r.width / 2, r.top + r.height / 2]);
        xf(l, "ADBE Position").setValue(pos);
        return l;
    }
    function addTypeOn(layer, t0, t1) {
        var anims = layer.property("ADBE Text Properties").property("ADBE Text Animators");
        var a = anims.addProperty("ADBE Text Animator");
        a.name = "TypeOn";
        a.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity").setValue(0);
        var sel = layer.property("ADBE Text Properties").property("ADBE Text Animators").property("TypeOn")
                       .property("ADBE Text Selectors").addProperty("ADBE Text Selector");
        try { sel.property("ADBE Text Range Advanced").property("ADBE Text Selector Smoothness").setValue(0); } catch (e) {}
        var startP = layer.property("ADBE Text Properties").property("ADBE Text Animators").property("TypeOn")
                          .property("ADBE Text Selectors").property(1).property("ADBE Text Percent Start");
        K(startP, t0, 0); K(startP, t1, 100);
    }

    // ---- animation building blocks
    function popIn(scaleP, t, final, dims) {
        var f = final || 100, mk = dims === 2 ? S2 : S3;
        K(scaleP, t, mk(0)); K(scaleP, t + 0.18, mk(f * 1.18)); K(scaleP, t + 0.30, mk(f * 0.94)); K(scaleP, t + 0.42, mk(f));
    }
    function ring(comp, name, pos, t, col, size, maxScale) {
        var l = shapeLayer(comp, name, pos);
        newGroup(l, "Ring"); addEllipseTo(l, "Ring", size || 80); addStrokeTo(l, "Ring", col || CYAN, 4, 100);
        var sc = xf(l, "ADBE Scale"), op = xf(l, "ADBE Opacity");
        K(sc, t, S3(25)); K(sc, t + 0.7, S3(maxScale || 260));
        K(op, Math.max(0, t - 0.04), 0); K(op, t, 90); K(op, t + 0.7, 0);
        l.blendingMode = BlendingMode.ADD;
        return l;
    }

    // ---- global easing pass: every keyframe gets easy ease (nothing linear)
    function easeProp(p) {
        var n = 1;
        if (p.propertyValueType === PropertyValueType.TwoD) n = 2;
        else if (p.propertyValueType === PropertyValueType.ThreeD) n = 3;
        for (var k = 1; k <= p.numKeys; k++) {
            try { p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER); } catch (e) {}
            var a = []; for (var d = 0; d < n; d++) a.push(new KeyframeEase(0, EASE_INFLUENCE));
            try { p.setTemporalEaseAtKey(k, a, a); }
            catch (e2) { try { p.setTemporalEaseAtKey(k, [new KeyframeEase(0, EASE_INFLUENCE)], [new KeyframeEase(0, EASE_INFLUENCE)]); } catch (e3) {} }
        }
    }
    function walkEase(g) {
        for (var j = 1; j <= g.numProperties; j++) {
            var p = g.property(j);
            if (!p) continue;
            if (p.propertyType === PropertyType.PROPERTY) {
                var vt = p.propertyValueType;
                if (p.numKeys > 0 && vt !== PropertyValueType.TEXT_DOCUMENT && vt !== PropertyValueType.MARKER &&
                    vt !== PropertyValueType.NO_VALUE && vt !== PropertyValueType.CUSTOM_VALUE) easeProp(p);
            } else {
                walkEase(p);
            }
        }
    }
    function easeComp(comp) { for (var i = 1; i <= comp.numLayers; i++) walkEase(comp.layer(i)); }

    function newComp(name, dur, folder) {
        var c = app.project.items.addComp(name, W, H, 1, dur, FPS);
        c.bgColor = BLACK;
        c.motionBlur = true;
        if (folder) c.parentFolder = folder;
        return c;
    }

    // ================================================================ SCENE 1 — VILLAGE
    function buildScene1(c, S) {
        function T(a) { return a - S; }

        // stars: "just open sky"
        var st = shapeLayer(c, "S1_Stars_OpenSky");
        newGroup(st, "Stars");
        var r = rng(7);
        for (var i = 0; i < 46; i++) addEllipseTo(st, "Stars", 2 + r() * 4, [40 + r() * 1000, 140 + r() * 900]);
        addFillTo(st, "Stars", WHITE, 100);
        var sop = xf(st, "ADBE Opacity");
        K(sop, 0, 0); K(sop, T(B.openSky), 0); K(sop, T(B.openSky + 1.8), 65);
        sop.expression = "value * (0.8 + 0.2*Math.sin(time*2.3))";
        var spos = xf(st, "ADBE Position");
        K(spos, 0, [0, 0]); K(spos, T(B.L2 + 1), [-12, 0]);

        // hills: three parallax ridges, drawn left -> right with trim paths
        var hills = [
            { n: "S1_Hills_Back",  y: 1250, amp: 80,  w: 3, op: 45,  t0: B.L1 + 0.8,  t1: B.L1 + 3.6,     drift: -25,  seed: 3 },
            { n: "S1_Hills_Mid",   y: 1370, amp: 100, w: 5, op: 70,  t0: B.noSkyline, t1: B.noSkyline + 2.5, drift: -55, seed: 5 },
            { n: "S1_Hills_Front", y: 1500, amp: 125, w: 7, op: 100, t0: B.noTowers,  t1: B.noTowers + 2.7,  drift: -100, seed: 9 }
        ];
        for (var h = 0; h < hills.length; h++) {
            var hd = hills[h], hr = rng(hd.seed), pts = [], k = 0;
            for (var x = -140; x <= 1340; x += 185) {
                var peak = (k % 2 === 0) ? (0.15 + hr() * 0.25) : (0.7 + hr() * 0.3);
                pts.push([x, hd.y - hd.amp * peak]); k++;
            }
            var sm = smooth(pts, 1.2);
            var hl = shapeLayer(c, hd.n);
            newGroup(hl, "Ridge");
            addPathTo(hl, "Ridge", pts, sm.inT, sm.outT, false);
            addTrimTo(hl, "Ridge", 0, 0);
            addStrokeTo(hl, "Ridge", CYAN, hd.w, 100);
            xf(hl, "ADBE Opacity").setValue(hd.op);
            var te = trimP(hl, "Ridge", "end");
            K(te, T(hd.t0), 0); K(te, T(hd.t1), 100);
            var hp = xf(hl, "ADBE Position");
            K(hp, 0, [0, 0]); K(hp, T(B.L2 + 1), [hd.drift, -hd.drift * 0.15]);
            if (h === 2) addGlow(hl, CYAN, 30, 1.2, 30, "Glow_Hills");
        }

        // "Telangana" types on small, then dissolves
        var tx = addText(c, "S1_TXT_Telangana", "Telangana", 46, CYAN, [540, 1110], 380);
        addTypeOn(tx, T(B.telangana - 0.2), T(B.telangana + 0.75));
        addBlur(tx, 0, "Dissolve_Blur");
        var tb = blurProp(tx, "Dissolve_Blur");
        if (tb) { K(tb, T(3.6), 0); K(tb, T(5.0), 30); }
        var top = xf(tx, "ADBE Opacity");
        K(top, T(3.6), 100); K(top, T(5.0), 0);
        var tp = xf(tx, "ADBE Position");
        K(tp, T(B.telangana), [540, 1110]); K(tp, T(5.0), [540, 1085]);
    }

    // ================================================================ SCENE 2 — SPARK
    function buildScene2(c, S) {
        function T(a) { return a - S; }
        var CENTER = [540, 960];

        function iconLayer(name, pos, t, seed) {
            var l = shapeLayer(c, name, pos);
            l.motionBlur = true;
            popIn(xf(l, "ADBE Scale"), T(t), 100);
            var sc = xf(l, "ADBE Scale");
            K(sc, T(B.followed - 0.2), S3(100)); K(sc, T(B.followed + 0.5), S3(70));
            var op = xf(l, "ADBE Opacity");
            K(op, T(t) - 0.04, 0); K(op, T(t) + 0.04, 100); K(op, T(B.followed - 0.2), 100); K(op, T(B.followed + 0.5), 0);
            var rot = xf(l, "ADBE Rotate Z");
            K(rot, T(t), -14); K(rot, T(t) + 0.3, 4); K(rot, T(t) + 0.5, 0);
            // shockwave push when CURIOSITY slams
            var p = xf(l, "ADBE Position");
            var dx = pos[0] - CENTER[0], dy = pos[1] - CENTER[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
            K(p, T(B.curiosity), pos);
            K(p, T(B.curiosity) + 0.15, [pos[0] + dx / len * 45, pos[1] + dy / len * 45]);
            K(p, T(B.curiosity) + 0.5, pos);
            p.expression = "value + [0, 10*Math.sin(time*1.8 + " + seed + ")]";
            return l;
        }

        // Book
        var book = iconLayer("S2_Icon_Book", [260, 620], B.curious, 1);
        newGroup(book, "Pages");
        addPathTo(book, "Pages", [[-8, -38], [-80, -52], [-80, 42], [-8, 56]], null, null, true);
        addPathTo(book, "Pages", [[8, -38], [80, -52], [80, 42], [8, 56]], null, null, true);
        addPathTo(book, "Pages", [[-64, -26], [-24, -18]]);
        addPathTo(book, "Pages", [[-64, -4], [-24, 4]]);
        addPathTo(book, "Pages", [[64, -26], [24, -18]]);
        addStrokeTo(book, "Pages", CYAN, 6, 100);
        addGlow(book, CYAN, 25, 1.3, 30, "Glow_Icon");

        // Bulb (lights up gold)
        var bulb = iconLayer("S2_Icon_Bulb", [820, 620], B.howThings, 2.5);
        newGroup(bulb, "Glass");
        addEllipseTo(bulb, "Glass", 100, [0, -24]);
        addPathTo(bulb, "Glass", [[-22, 20], [-18, 40]]);
        addPathTo(bulb, "Glass", [[22, 20], [18, 40]]);
        addPathTo(bulb, "Glass", [[-12, -16], [-4, 6], [4, -16], [12, 6]]);
        addRectTo(bulb, "Glass", [42, 26], [0, 54], 6);
        addStrokeTo(bulb, "Glass", CYAN, 6, 100);
        newGroup(bulb, "Light");
        addEllipseTo(bulb, "Light", 84, [0, -24]);
        addFillTo(bulb, "Light", GOLD, 0);
        var lo = fillP(bulb, "Light", "ADBE Vector Fill Opacity");
        K(lo, T(B.howThings) + 0.3, 0); K(lo, T(B.howThings) + 0.55, 85); K(lo, T(B.howThings) + 0.9, 60);
        addGlow(bulb, GOLD, 30, 1.4, 30, "Glow_Icon");

        // Code brackets </>
        var code = iconLayer("S2_Icon_Code", [540, 1380], B.codeBeat, 4);
        newGroup(code, "Brackets");
        addPathTo(code, "Brackets", [[-34, -44], [-78, 0], [-34, 44]]);
        addPathTo(code, "Brackets", [[34, -44], [78, 0], [34, 44]]);
        addPathTo(code, "Brackets", [[16, -56], [-16, 56]]);
        addStrokeTo(code, "Brackets", CYAN, 7, 100);
        addGlow(code, CYAN, 25, 1.3, 30, "Glow_Icon");

        // Shockwave
        ring(c, "S2_Shockwave_Ring", CENTER, T(B.curiosity), CYAN, 200, 520);

        // CURIOSITY slam
        var cu = addText(c, "S2_TXT_CURIOSITY", "CURIOSITY", 150, CYAN, CENTER, 20, 980);
        cu.motionBlur = true;
        var t0 = T(B.curiosity) - 0.12;
        var cop = xf(cu, "ADBE Opacity"), csc = xf(cu, "ADBE Scale"), crt = xf(cu, "ADBE Rotate Z"), cps = xf(cu, "ADBE Position");
        K(cop, t0, 0); K(cop, t0 + 0.06, 100);
        K(csc, t0, S3(340)); K(csc, t0 + 0.14, S3(90)); K(csc, t0 + 0.26, S3(104)); K(csc, t0 + 0.38, S3(100));
        K(crt, t0, -12); K(crt, t0 + 0.14, 4); K(crt, t0 + 0.3, -1); K(crt, t0 + 0.75, -3);   // rotates slightly, then locks
        K(csc, T(B.followed - 0.15), S3(100)); K(csc, T(B.followed + 0.5), S3(55));
        K(cps, T(B.followed - 0.15), CENTER); K(cps, T(B.followed + 0.5), [540, 380]);
        K(cop, T(B.followed + 0.1), 100); K(cop, T(B.followed + 0.7), 0);
        addGlow(cu, CYAN, 40, 1.5, 40, "Glow_Text");

        // "through engineering / long nights / every door" beats
        ring(c, "S2_Beat_Ring_Engineering", [860, 1340], T(B.engineering), CYAN, 70, 240);
        ring(c, "S2_Beat_Ring_LongNights", [220, 1100], T(B.nights), CYAN, 70, 240);
        ring(c, "S2_Beat_Ring_EveryDoor", [860, 860], T(B.door), CYAN, 70, 240);

        // Door that cracks open
        var dr = shapeLayer(c, "S2_Door", [540, 520]);
        newGroup(dr, "Frame");
        addRectTo(dr, "Frame", [200, 320], [0, 0], 0);
        addTrimTo(dr, "Frame", 0, 0);
        addStrokeTo(dr, "Frame", CYAN, 5, 100);
        var fe = trimP(dr, "Frame", "end");
        K(fe, T(B.door), 0); K(fe, T(B.door) + 0.8, 100);
        newGroup(dr, "Light");
        addRectTo(dr, "Light", [188, 308], [0, 0], 0);
        addFillTo(dr, "Light", GOLD, 85);
        gt(dr, "Light").property("ADBE Vector Anchor").setValue([-94, 0]);
        gt(dr, "Light").property("ADBE Vector Position").setValue([-94, 0]);
        var ls = gt(dr, "Light").property("ADBE Vector Scale");
        K(ls, T(B.cracked) - 0.1, [0, 100]); K(ls, T(B.cracked) + 0.25, [30, 100]); K(ls, T(B.doorEnter), [100, 100]);
        addGlow(dr, GOLD, 50, 1.4, 30, "Glow_Door");
        var dop = xf(dr, "ADBE Opacity");
        K(dop, T(B.door) - 0.05, 0); K(dop, T(B.door) + 0.1, 100);
    }

    // ================================================================ SCENE 3 — LEAP
    function buildScene3(c, S) {
        function T(a) { return a - S; }
        var BASE = 1580;

        // Ocean: animated sine lines in two parallax layers
        function waves(name, lines, amp, w, op, speed, exitY) {
            var l = shapeLayer(c, name);
            for (var i = 0; i < lines.length; i++) {
                var g = "Wave_" + (i + 1);
                newGroup(l, g);
                addPathTo(l, g, [[0, 0], [10, 0]]);
                gv(l, g).property("ADBE Vector Shape - Group").property("ADBE Vector Shape").expression =
                    "var Y=" + lines[i] + ", A=" + amp + ", SP=" + speed + ", PH=" + (i * 1.7) + ";\n" +
                    "var pts=[]; for (var x=-80; x<=1160; x+=24) { pts.push([x, Y + A*Math.sin(x/110 + time*SP + PH) + 0.4*A*Math.sin(x/47 - time*SP*1.3)]); }\n" +
                    "createPath(pts, [], [], false);";
                addTrimTo(l, g, 0, 0);
                addStrokeTo(l, g, CYAN, w, 100);
                var te = trimP(l, g, "end");
                K(te, T(B.L3 + 0.15 + i * 0.12), 0); K(te, T(B.ocean + 0.3 + i * 0.12), 100);
            }
            xf(l, "ADBE Opacity").setValue(op);
            var p = xf(l, "ADBE Position");
            K(p, T(B.language - 0.25), [0, 0]); K(p, T(B.language + 0.8), [0, exitY]);
            var o = xf(l, "ADBE Opacity");
            K(o, T(B.language - 0.25), op); K(o, T(B.language + 0.8), 0);
            return l;
        }
        waves("S3_Ocean_Waves_Back", [1300, 1370], 10, 3, 45, 1.1, 260);
        var wf = waves("S3_Ocean_Waves_Front", [1450, 1540, 1630], 16, 5, 100, 1.8, 520);
        addGlow(wf, CYAN, 25, 1.0, 35, "Glow_Waves");

        // Dotted plane arc  (same bezier the particle rides in the main comp)
        var P0 = [110, 1150], P3 = [970, 800], C1 = [300, 620], C2 = [760, 560];
        var arc = shapeLayer(c, "S3_Plane_Arc_Dotted");
        newGroup(arc, "Arc");
        addPathTo(arc, "Arc", [P0, P3], [[0, 0], [C2[0] - P3[0], C2[1] - P3[1]]], [[C1[0] - P0[0], C1[1] - P0[1]], [0, 0]], false);
        addTrimTo(arc, "Arc", 0, 0);
        addStrokeTo(arc, "Arc", CYAN, 7, 100);
        try {
            var d1 = strokeP(arc, "Arc", "ADBE Vector Stroke Dashes").addProperty("ADBE Vector Stroke Dash 1");
            d1.setValue(1);
            var g1 = strokeP(arc, "Arc", "ADBE Vector Stroke Dashes").addProperty("ADBE Vector Stroke Gap 1");
            g1.setValue(22);
        } catch (e) { WARN.push("S3_Plane_Arc_Dotted: dashes (arc will be solid)"); }
        var ae = trimP(arc, "Arc", "end");
        K(ae, T(B.masters), 0); K(ae, T(B.arcEnd), 100);
        var aop = xf(arc, "ADBE Opacity");
        K(aop, T(B.everything - 0.1), 100); K(aop, T(B.everything + 0.7), 0);
        addGlow(arc, CYAN, 25, 1.2, 30, "Glow_Arc");

        var dest = shapeLayer(c, "S3_Arc_Destination_Dot", P3);
        newGroup(dest, "Dot"); addEllipseTo(dest, "Dot", 22); addFillTo(dest, "Dot", GOLD, 100);
        popIn(xf(dest, "ADBE Scale"), T(B.arcEnd), 100);
        var dop = xf(dest, "ADBE Opacity");
        K(dop, T(B.everything - 0.1), 100); K(dop, T(B.everything + 0.7), 0);
        ring(c, "S3_Arrival_Ring", P3, T(B.arcEnd), GOLD, 60, 260);

        // City ground line
        var gl = shapeLayer(c, "S3_City_Ground");
        newGroup(gl, "Line");
        addPathTo(gl, "Line", [[-40, BASE], [1120, BASE]]);
        addTrimTo(gl, "Line", 50, 50);
        addStrokeTo(gl, "Line", GOLD, 3, 100);
        var gs = trimP(gl, "Line", "start"), ge = trimP(gl, "Line", "end");
        K(gs, T(B.language - 0.1), 50); K(gs, T(B.language + 0.6), 0);
        K(ge, T(B.language - 0.1), 50); K(ge, T(B.language + 0.6), 100);

        // City skyline: 3 parallax layers of blocks that build upward
        function city(name, seed, wMin, wMax, hMin, hMax, sw, op, t0, stagger, drift, push) {
            var l = shapeLayer(c, name, [540, BASE]);
            xf(l, "ADBE Anchor Point").setValue([540, BASE]);
            var r = rng(seed), x = -90, i = 0;
            while (x < 1170) {
                var w = wMin + r() * (wMax - wMin), h = hMin + r() * (hMax - hMin), gap = 6 + r() * 16;
                var g = "Block_" + pad(i + 1);
                newGroup(l, g);
                addRectTo(l, g, [w, h], [x + w / 2, BASE - h / 2], 0);
                addStrokeTo(l, g, GOLD, sw, 100);
                addFillTo(l, g, BLACK, 100);
                gt(l, g).property("ADBE Vector Anchor").setValue([x + w / 2, BASE]);
                gt(l, g).property("ADBE Vector Position").setValue([x + w / 2, BASE]);
                var sc = gt(l, g).property("ADBE Vector Scale");
                var tt = T(t0) + i * stagger;
                K(sc, tt, [100, 0]); K(sc, tt + 0.22, [100, 112]); K(sc, tt + 0.36, [100, 96]); K(sc, tt + 0.48, [100, 100]);
                x += w + gap; i++;
            }
            xf(l, "ADBE Opacity").setValue(op);
            // parallax drift
            var p = xf(l, "ADBE Position");
            K(p, T(B.language), [540, BASE]); K(p, T(B.L4 + 1.0), [540 + drift, BASE]);
            // "bigger, faster, harder" pushes
            var s = xf(l, "ADBE Scale"), beats = [B.everything, B.bigger, B.faster, B.harder], v = 100;
            K(s, T(B.everything) - 0.05, S3(100));
            for (var b = 0; b < beats.length; b++) {
                var nv = v + push;
                K(s, T(beats[b]), S3(v)); K(s, T(beats[b]) + 0.12, S3(nv + push * 0.6)); K(s, T(beats[b]) + 0.32, S3(nv));
                v = nv;
            }
            // dissolve into the network
            addBlur(l, 0, "Dissolve_Blur");
            var bp = blurProp(l, "Dissolve_Blur");
            if (bp) { K(bp, T(B.L4), 0); K(bp, T(B.L4 + 1.0), 60); }
            var o = xf(l, "ADBE Opacity");
            K(o, T(B.L4 + 0.1), op); K(o, T(B.L4 + 1.1), 0);
            return l;
        }
        city("S3_City_Back",  11, 70, 120, 320, 640, 3, 40,  B.language + 0.05, 0.05, -30, 1.5);
        city("S3_City_Mid",   23, 90, 140, 240, 500, 4, 70,  B.language + 0.45, 0.06, -70, 3);
        var cf = city("S3_City_Front", 37, 110, 175, 140, 380, 5, 100, B.language + 0.85, 0.07, -130, 5);
        addGlow(cf, GOLD, 30, 1.1, 40, "Glow_City");

        // "A NEW COUNTRY" rises with motion blur
        var nc = addText(c, "S3_TXT_A_NEW_COUNTRY", "A NEW COUNTRY", 100, GOLD, [540, 430], 60, 960);
        nc.motionBlur = true;
        var np = xf(nc, "ADBE Position"), no = xf(nc, "ADBE Opacity");
        K(np, T(B.country) - 0.06, [540, 660]); K(np, T(B.country) + 0.28, [540, 412]); K(np, T(B.country) + 0.42, [540, 434]); K(np, T(B.country) + 0.55, [540, 430]);
        K(no, T(B.country) - 0.06, 0); K(no, T(B.country) + 0.12, 100);
        K(np, T(B.everything - 0.2), [540, 430]); K(np, T(B.everything + 0.25), [540, 290]);
        K(no, T(B.everything - 0.1), 100); K(no, T(B.everything + 0.25), 0);
        addGlow(nc, GOLD, 35, 1.2, 45, "Glow_Text");
    }

    // ================================================================ SCENE 4 — BECOMING
    function buildScene4(c, S) {
        function T(a) { return a - S; }
        var ROOT = [540, 1580];
        var rows = [
            { y: 1350, xs: [240, 440, 640, 840] },
            { y: 1080, xs: [180, 360, 540, 720, 900] },
            { y: 810,  xs: [240, 440, 640, 840] },
            { y: 560,  xs: [540] }
        ];
        var nodes = [], idx = 0, r, i;
        for (r = 0; r < rows.length; r++) {
            nodes[r] = [];
            for (i = 0; i < rows[r].xs.length; i++) {
                nodes[r].push({
                    name: "S4_Node_R" + (r + 1) + "_" + (i + 1),
                    pos: [rows[r].xs[i], rows[r].y],
                    emerge: B.L4 + 0.5 + idx * 0.08,
                    light: (r < 3) ? (B.reason + idx * 0.17) : B.answer
                });
                idx++;
            }
        }
        function posExpr(n) { return n ? "thisComp.layer(\"" + n.name + "\").transform.position" : "[" + ROOT[0] + "," + ROOT[1] + "]"; }

        // Connections (one layer per layer-pair). Paths follow the nodes by expression.
        function links(name, fromList, toList, row) {
            var l = shapeLayer(c, name);
            l.blendingMode = BlendingMode.ADD;
            var k = 0;
            for (var a = 0; a < fromList.length; a++) {
                for (var b = 0; b < toList.length; b++) {
                    var A = fromList[a], Bn = toList[b], g = "Link_" + pad(k + 1);
                    newGroup(l, g);
                    addPathTo(l, g, [[0, 0], [1, 1]]);
                    gv(l, g).property("ADBE Vector Shape - Group").property("ADBE Vector Shape").expression =
                        "createPath([" + posExpr(A) + ", " + posExpr(Bn) + "], [], [], false);";
                    addTrimTo(l, g, 0, 0);
                    addStrokeTo(l, g, CYAN, 2.5, 30);
                    var drawT = Math.max(A ? A.emerge : 0, Bn.emerge) + 0.55;
                    var te = trimP(l, g, "end");
                    K(te, T(drawT), 0); K(te, T(drawT) + 0.45, 100);
                    strokeP(l, g, "ADBE Vector Stroke Opacity").expression =
                        "var t = time - " + T(B.reason).toFixed(3) + ";\n" +
                        "t < 0 ? 30 : 30 + 70*Math.pow(Math.max(0, Math.sin(t*4.5 - " + (row * 1.1).toFixed(2) + " - " + (k * 0.37).toFixed(2) + ")), 10);";
                    k++;
                }
            }
            addGlow(l, CYAN, 20, 1.2, 25, "Glow_Links");
            return l;
        }
        links("S4_Links_Root_to_R1", [null], nodes[0], 0);
        links("S4_Links_R1_to_R2", nodes[0], nodes[1], 1);
        links("S4_Links_R2_to_R3", nodes[1], nodes[2], 2);
        links("S4_Links_R3_to_Output", nodes[2], nodes[3], 3);

        // Nodes: fly out of the particle, then light up one by one
        for (r = 0; r < nodes.length; r++) {
            for (i = 0; i < nodes[r].length; i++) {
                var n = nodes[r][i], isOut = (r === 3);
                var l = shapeLayer(c, n.name, ROOT);
                l.motionBlur = true;
                newGroup(l, "Core"); addEllipseTo(l, "Core", isOut ? 40 : 30); addFillTo(l, "Core", DIMCY, 100);
                newGroup(l, "Ring"); addEllipseTo(l, "Ring", isOut ? 72 : 54); addStrokeTo(l, "Ring", isOut ? GOLD : CYAN, 3, 50);
                var p = xf(l, "ADBE Position"), e = T(n.emerge);
                var over = [n.pos[0] + (n.pos[0] - ROOT[0]) * 0.05, n.pos[1] + (n.pos[1] - ROOT[1]) * 0.05];
                K(p, e, ROOT); K(p, e + 0.42, over); K(p, e + 0.62, n.pos);
                var sc = xf(l, "ADBE Scale"), lt = T(n.light);
                K(sc, e, S3(0)); K(sc, e + 0.3, S3(100));
                K(sc, lt, S3(100)); K(sc, lt + 0.12, S3(isOut ? 170 : 140)); K(sc, lt + 0.35, S3(100));
                var fc = fillP(l, "Core", "ADBE Vector Fill Color"), lit = isOut ? GOLD : CYAN;
                K(fc, lt - 0.02, c4(DIMCY)); K(fc, lt + 0.06, c4([1, 1, 1])); K(fc, lt + 0.4, c4(lit));
                addGlow(l, lit, 30, 1.5, 20, "Glow_Node");
            }
        }

        // "I BUILD AI" assembles from scattered letters
        var word = "I BUILD AI", size = 150, gapX = size * 0.05, spaceW = size * 0.32;
        var letters = [], widths = [], total = 0, j;
        for (j = 0; j < word.length; j++) {
            var ch = word.charAt(j);
            if (ch === " ") { letters.push(null); widths.push(spaceW); total += spaceW; continue; }
            var tl = addText(c, "S4_TXT_Letter_" + pad(j + 1) + "_" + ch, ch, size, WHITE, [540, 330], 0);
            var rw = tl.sourceRectAtTime(0, false).width;
            letters.push(tl); widths.push(rw); total += rw + gapX;
        }
        total -= gapX;
        var xCursor = 540 - total / 2, rr = rng(42), li = 0;
        for (j = 0; j < letters.length; j++) {
            if (!letters[j]) { xCursor += widths[j]; continue; }
            var L = letters[j], target = [xCursor + widths[j] / 2, 330];
            xCursor += widths[j] + gapX;
            L.motionBlur = true;
            var t0 = T(B.today) + 0.05 + li * 0.045, t1 = T(B.buildAI) + 0.05 + li * 0.03;
            var start = [target[0] + (rr() - 0.5) * 1400, target[1] + (rr() - 0.5) * 1300 + 300];
            var lp = xf(L, "ADBE Position"), lr = xf(L, "ADBE Rotate Z"), ls = xf(L, "ADBE Scale"), lo = xf(L, "ADBE Opacity");
            K(lp, t0, start); K(lp, t1, [target[0], target[1] + 8]); K(lp, t1 + 0.15, target);
            K(lr, t0, (rr() - 0.5) * 240); K(lr, t1, 6); K(lr, t1 + 0.15, 0);
            K(ls, t0, S3(260)); K(ls, t1, S3(96)); K(ls, t1 + 0.15, S3(100));
            K(lo, t0, 0); K(lo, t0 + 0.2, 100);
            addGlow(L, CYAN, 35, 1.3, 45, "Glow_Text");
            li++;
        }
    }

    // ================================================================ SCENE 5 — CLOSE
    function buildScene5(c, S) {
        function T(a) { return a - S; }
        var END = [540, 700];

        // Journey line (built at scale 100 first so milestones can be parented cleanly)
        var pts = [[170, 1720], [860, 1590], [220, 1430], [870, 1250], [935, 960], [END[0], END[1]]];
        var sm = smooth(pts, 1.1);
        var jl = shapeLayer(c, "S5_Journey_Line", END);
        xf(jl, "ADBE Anchor Point").setValue(END);
        newGroup(jl, "Line");
        addPathTo(jl, "Line", pts, sm.inT, sm.outT, false);
        addTrimTo(jl, "Line", 0, 72);
        addStrokeTo(jl, "Line", WHITE, 2, 100);
        addStrokeTo(jl, "Line", CYAN, 7, 85);
        addGlow(jl, CYAN, 45, 1.6, 25, "Glow_Journey");

        var labels = ["Telangana", "Curiosity", "The Ocean", "The City"];
        var ms = [];
        for (var i = 0; i < labels.length; i++) {
            var dot = shapeLayer(c, "S5_Milestone_Dot_" + (i + 1), pts[i]);
            newGroup(dot, "Dot"); addEllipseTo(dot, "Dot", 20); addFillTo(dot, "Dot", GOLD, 100);
            var lab = addText(c, "S5_TXT_Milestone_" + (i + 1), labels[i].toUpperCase(), 24, GOLD, [pts[i][0], pts[i][1] + 40], 200);
            dot.parent = jl; lab.parent = jl;
            ms.push([dot, lab]);
        }
        // pull back
        var js = xf(jl, "ADBE Scale");
        K(js, 0, S3(260)); K(js, T(B.L5 + 1.8), S3(100));
        var je = trimP(jl, "Line", "end");
        K(je, 0, 72); K(je, T(B.L5 + 0.9), 100);
        var jo = xf(jl, "ADBE Opacity");
        K(jo, T(B.name), 100); K(jo, T(B.name + 0.8), 40);
        for (i = 0; i < ms.length; i++) {
            var pt = T(B.L5 + 0.6 + i * 0.2);
            popIn(xf(ms[i][0], "ADBE Scale"), pt, 100);
            var lo = xf(ms[i][1], "ADBE Opacity");
            K(lo, pt, 0); K(lo, pt + 0.35, 75); K(lo, T(B.name), 75); K(lo, T(B.name + 0.8), 25);
            var dO = xf(ms[i][0], "ADBE Opacity");
            K(dO, T(B.name), 100); K(dO, T(B.name + 0.8), 50);
        }

        // Name + gold underline
        var nm = addText(c, "S5_TXT_AKHIL_ANUMOLU", "AKHIL ANUMOLU", 96, WHITE, [540, 960], 80, 940);
        var nw = nm.sourceRectAtTime(0, false).width;
        addBlur(nm, 0, "Reveal_Blur");
        var nb = blurProp(nm, "Reveal_Blur");
        if (nb) { K(nb, T(B.name), 25); K(nb, T(B.name + 0.8), 0); }
        var no = xf(nm, "ADBE Opacity"), np = xf(nm, "ADBE Position");
        K(no, T(B.name), 0); K(no, T(B.name + 0.8), 100);
        K(np, T(B.name), [540, 990]); K(np, T(B.name + 0.8), [540, 960]);
        addGlow(nm, CYAN, 30, 0.8, 55, "Glow_Text");

        var ul = shapeLayer(c, "S5_Underline_Gold");
        newGroup(ul, "Line");
        addPathTo(ul, "Line", [[540 - nw / 2, 1040], [540 + nw / 2, 1040]]);
        addTrimTo(ul, "Line", 50, 50);
        addStrokeTo(ul, "Line", GOLD, 6, 100);
        var us = trimP(ul, "Line", "start"), ue = trimP(ul, "Line", "end");
        K(us, T(B.name + 0.6), 50); K(us, T(B.name + 1.5), 0);
        K(ue, T(B.name + 0.6), 50); K(ue, T(B.name + 1.5), 100);
        addGlow(ul, GOLD, 30, 1.4, 25, "Glow_Underline");
    }

    // ================================================================ MAIN BUILD
    function build() {
        if (!app.project) app.newProject();
        FONT = pickFont();

        var folder = app.project.items.addFolder("Origin Story");
        var scFolder = app.project.items.addFolder("Scenes"); scFolder.parentFolder = folder;

        // voiceover
        var scriptFolder = (new File($.fileName)).parent;
        var voFile = new File(scriptFolder.fsName + "/voiceover.mp3");
        if (!voFile.exists) voFile = File.openDialog("Locate voiceover.mp3", "*.mp3;*.wav");
        var voItem = null;
        if (voFile && voFile.exists) {
            voItem = app.project.importFile(new ImportOptions(voFile));
            voItem.parentFolder = folder;
        } else {
            WARN.push("voiceover.mp3 not found - comp built without audio");
        }
        var voDur = voItem ? voItem.duration : VO_FALLBACK_DUR;
        var compDur = voDur + TAIL;

        var main = newComp("MAIN_Origin_Story", compDur, folder);

        // background
        main.layers.addSolid(BLACK, "BG_Matte_Black", W, H, 1, compDur);
        if (voItem) { var vo = main.layers.add(voItem); vo.name = "VO_voiceover"; vo.startTime = 0; }

        // scenes
        var builders = [buildScene1, buildScene2, buildScene3, buildScene4, buildScene5];
        var overlaps = [1.0, 1.0, 1.3, 1.0, 0];
        var sceneLayers = [];
        for (var i = 0; i < SCENES.length; i++) {
            var sStart = (i === 0) ? 0 : SCENES[i].start;
            var sEnd = (i < SCENES.length - 1) ? SCENES[i + 1].start + overlaps[i] : compDur;
            var sc = newComp("SC" + SCENES[i].id + "_" + SCENES[i].name, sEnd - sStart, scFolder);
            builders[i](sc, sStart);
            easeComp(sc);
            var sl = main.layers.add(sc);
            sl.name = "SC" + SCENES[i].id + "_" + SCENES[i].name;
            sl.startTime = sStart;
            sl.motionBlur = true;
            sceneLayers.push(sl);
        }
        // scene hand-offs (opacity fades on the precomp layers)
        var fadeOut = [[B.L2, 0.9], [B.L3, 0.9], [B.L4 + 0.4, 0.85], [B.L5, 0.95]];
        for (i = 0; i < fadeOut.length; i++) {
            var op = xf(sceneLayers[i], "ADBE Opacity");
            K(op, fadeOut[i][0], 100); K(op, fadeOut[i][0] + fadeOut[i][1], 0);
        }
        // impact shakes
        function shake(layer, hits, amp) {
            xf(layer, "ADBE Position").expression =
                "var hits=[" + hits.join(",") + "], amp=0;\n" +
                "for (var i=0;i<hits.length;i++){ var t=time-hits[i]; if (t>=0 && t<0.4) amp=Math.max(amp," + amp + "*(1-t/0.4)); }\n" +
                "value + [Math.sin(time*95)*amp, Math.cos(time*71)*amp];";
        }
        shake(sceneLayers[1], [B.curiosity], 16);
        shake(sceneLayers[2], [B.everything, B.bigger, B.faster, B.harder], 8);
        // glow peak on the network
        addGlow(sceneLayers[3], CYAN, 60, 0.6, 50, "Glow_Peak");
        var gp = fxProp(sceneLayers[3], "Glow_Peak", ["ADBE Glo2-0004", "Glow Intensity"]);
        if (gp) { K(gp, B.L4, 0.6); K(gp, B.reason, 1.0); K(gp, B.kid, 1.2); K(gp, B.answer, 2.6); K(gp, B.answer + 1.2, 2.6); K(gp, B.L5 + 0.3, 0.8); }

        // ---------------- HERO particle trail
        var trail = shapeLayer(main, "HERO_Trail");
        trail.blendingMode = BlendingMode.ADD;
        addFx(trail, "ADBE Slider Control", "Trail Length (sec)");
        var tlen = fxProp(trail, "Trail Length (sec)", ["ADBE Slider Control-0001", "Slider"]);
        if (tlen) { K(tlen, B.L2, 0.45); K(tlen, B.L3, 0.45); K(tlen, B.L3 + 0.3, 0.8); K(tlen, B.ocean + 0.4, 0.45); }
        newGroup(trail, "Trail");
        addPathTo(trail, "Trail", [[0, 0], [1, 1]]);
        gv(trail, "Trail").property("ADBE Vector Shape - Group").property("ADBE Vector Shape").expression =
            "var p = thisComp.layer(\"HERO_Particle\").transform.position;\n" +
            "var len = Math.max(0.02, effect(\"Trail Length (sec)\")(1));\n" +
            "var n = 32, pts = [];\n" +
            "for (var i = 0; i < n; i++) pts.push(p.valueAtTime(time - len*i/(n-1)));\n" +
            "createPath(pts, [], [], false);";
        addStrokeTo(trail, "Trail", CORE, 3, 100);
        addStrokeTo(trail, "Trail", CYAN, 10, 55);
        try {
            var tp = strokeP(trail, "Trail", "ADBE Vector Stroke Taper");
            tp.property("ADBE Vector Taper End Length").setValue(100);
        } catch (e) {}
        addGlow(trail, CYAN, 40, 1.6, 20, "Glow_Trail");
        var trop = xf(trail, "ADBE Opacity");
        K(trop, B.L2 - 0.1, 0); K(trop, B.L2 + 0.3, 100); K(trop, B.answer + 0.6, 100); K(trop, B.L5, 0);

        // ---------------- HERO particle (halo + core)
        var halo = shapeLayer(main, "HERO_Particle_Halo");
        newGroup(halo, "Halo"); addEllipseTo(halo, "Halo", 210); addFillTo(halo, "Halo", CYAN, 100);
        addBlur(halo, 60, "Soft");
        halo.blendingMode = BlendingMode.ADD;

        var pl = shapeLayer(main, "HERO_Particle", [540, 1030]);
        pl.motionBlur = true;
        newGroup(pl, "Core"); addEllipseTo(pl, "Core", 24); addFillTo(pl, "Core", CORE, 100);
        newGroup(pl, "Inner_Glow"); addEllipseTo(pl, "Inner_Glow", 58); addFillTo(pl, "Inner_Glow", CYAN, 40);
        addGlow(pl, CYAN, 70, 1.8, 20, "Glow_Hero");

        halo.parent = pl;
        xf(halo, "ADBE Position").setValue([0, 0]);
        xf(halo, "ADBE Scale").setValue(S3(100));
        xf(halo, "ADBE Opacity").expression = "thisComp.layer(\"HERO_Particle\").transform.opacity * 0.3";

        var pp = xf(pl, "ADBE Position");
        var path = [
            [B.L1, [540, 1030]], [B.L2 - 0.5, [540, 960]],
            [B.L2, [540, 960]], [B.curious, [260, 620]], [B.howThings, [820, 620]], [B.codeBeat, [540, 1380]],
            [B.curiosity - 0.1, [540, 1160]], [B.followed, [540, 1160]],
            [B.engineering, [860, 1340]], [B.nights, [220, 1100]], [B.door, [860, 860]], [B.doorEnter, [540, 540]],
            [B.L3, [540, 540]], [B.L3 + 0.37, [1000, 1250]], [B.ocean, [110, 1150]], [B.masters, [110, 1150]],
            [B.arcEnd, [970, 800]], [B.everything, [970, 800]],
            [B.bigger, [300, 1000]], [B.faster, [780, 930]], [B.harder, [300, 860]], [B.keptGoing, [780, 790]], [B.L4 - 0.4, [540, 640]],
            [B.L4, [540, 640]], [B.L4 + 0.47, [540, 1580]], [B.kid, [540, 1580]],
            [B.kid + 0.45, [440, 1350]], [B.kid + 0.9, [540, 1080]], [B.kid + 1.35, [640, 810]], [B.answer, [540, 560]],
            [B.L5, [540, 560]], [B.L5 + 0.9, [540, 700]]
        ];
        for (i = 0; i < path.length; i++) K(pp, path[i][0], path[i][1]);
        for (i = 1; i <= pp.numKeys; i++) { try { pp.setSpatialTangentsAtKey(i, [0, 0], [0, 0]); } catch (e) {} }
        // ride the plane arc (same bezier as S3_Plane_Arc_Dotted)
        try {
            var kA = pp.nearestKeyIndex(snap(B.masters)), kB = pp.nearestKeyIndex(snap(B.arcEnd));
            pp.setSpatialTangentsAtKey(kA, [0, 0], [300 - 110, 620 - 1150]);
            pp.setSpatialTangentsAtKey(kB, [760 - 970, 560 - 800], [0, 0]);
        } catch (e) { WARN.push("HERO_Particle: arc tangents"); }

        var pop = xf(pl, "ADBE Opacity");
        K(pop, B.L1, 0); K(pop, B.L1 + 1.6, 100);
        var psc = xf(pl, "ADBE Scale");
        K(psc, B.pulse - 0.15, S3(100)); K(psc, B.pulse + 0.05, S3(195)); K(psc, B.pulse + 0.25, S3(85)); K(psc, B.pulse + 0.45, S3(100));
        psc.expression =
            "var e1 = ease(time, " + (B.L2 - 1.0) + ", " + B.L2 + ", 1, 0);\n" +
            "var e2 = ease(time, " + (B.L5 + 1.5) + ", " + (B.L5 + 2.5) + ", 0, 1) * ease(time, " + (B.pulse - 0.6) + ", " + (B.pulse - 0.2) + ", 1, 0);\n" +
            "var b = 9*Math.sin(time*2*Math.PI/2.8)*e1 + 5*Math.sin(time*2*Math.PI/2.2)*e2;\n" +
            "value + [b, b];";
        var gi = fxProp(pl, "Glow_Hero", ["ADBE Glo2-0004", "Glow Intensity"]);
        if (gi) { K(gi, B.kid, 1.8); K(gi, B.answer, 3.0); K(gi, B.answer + 1.1, 3.0); K(gi, B.L5 + 0.5, 1.8); K(gi, B.pulse, 1.8); K(gi, B.pulse + 0.1, 3.5); K(gi, B.pulse + 0.6, 1.8); }

        // single pulse ring at the end
        var pr = shapeLayer(main, "HERO_Pulse_Ring");
        newGroup(pr, "Ring"); addEllipseTo(pr, "Ring", 80); addStrokeTo(pr, "Ring", CYAN, 4, 100);
        pr.blendingMode = BlendingMode.ADD;
        xf(pr, "ADBE Position").expression = "thisComp.layer(\"HERO_Particle\").transform.position";
        var prs = xf(pr, "ADBE Scale"), pro = xf(pr, "ADBE Opacity");
        K(prs, B.pulse - 0.05, S3(30)); K(prs, B.pulse + 0.8, S3(420));
        K(pro, B.pulse - 0.1, 0); K(pro, B.pulse - 0.05, 100); K(pro, B.pulse + 0.8, 0);
        addGlow(pr, CYAN, 30, 1.4, 20, "Glow_Ring");

        // ---------------- finishing layers
        var ftb = main.layers.addSolid(BLACK, "FX_Fade_To_Black", W, H, 1, compDur);
        var fo = xf(ftb, "ADBE Opacity");
        K(fo, B.voEnd + 0.3, 0); K(fo, compDur - 0.1, 100);

        var grain = main.layers.addSolid([0.5, 0.5, 0.5], "ADJ_Film_Grain", W, H, 1, compDur);
        grain.adjustmentLayer = true;
        grain.blendingMode = BlendingMode.OVERLAY;
        xf(grain, "ADBE Opacity").setValue(10);
        var fn = addFx(grain, "ADBE Fractal Noise", "Grain_FractalNoise");
        setFx(fn, ["Contrast"], 260);
        setFx(fn, ["Scale"], 8);
        setFx(fn, ["Complexity"], 3);
        setFx(fn, ["Evolution"], "time*1440", true);
        setFx(fn, ["Offset Turbulence"], "[random(0,1080), random(0,1920)]", true);

        var vig = main.layers.addSolid([0, 0, 0], "ADJ_Vignette", W, H, 1, compDur);
        vig.adjustmentLayer = true;
        var m = vig.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
        m.name = "Vignette_Mask";
        m.property("ADBE Mask Shape").setValue(ellipseShape(W / 2, H / 2, 640, 1040));
        m.property("ADBE Mask Feather").setValue([520, 520]);
        m.inverted = true;
        var bc = addFx(vig, "ADBE Brightness & Contrast 2", "Vignette_Darken");
        setFx(bc, ["ADBE Brightness & Contrast 2-0001", "Brightness"], -90);

        // ---------------- comp markers (one per voiceover line)
        for (i = 0; i < SCENES.length; i++) {
            var mv = new MarkerValue(SCENES[i].id + " " + SCENES[i].name);
            var nextT = (i < SCENES.length - 1) ? SCENES[i + 1].start : B.voEnd;
            try { mv.duration = snap(nextT - SCENES[i].start); } catch (e) {}
            try { main.markerProperty.setValueAtTime(snap(SCENES[i].start), mv); }
            catch (e2) { if (voItem) main.layer("VO_voiceover").property("ADBE Marker").setValueAtTime(snap(SCENES[i].start), mv); }
        }

        easeComp(main);
        main.openInViewer();
        return main;
    }

    // ================================================================ RUN
    app.beginUndoGroup("Build Origin Story");
    try {
        var mainComp = build();
        var msg = "Origin Story built.\n\nComp: " + mainComp.name + "  (" + mainComp.duration.toFixed(2) + "s @ " + FPS + "fps)\nFont: " + FONT + "\n\nScene markers:\n";
        for (var s = 0; s < SCENES.length; s++) msg += "  " + SCENES[s].id + " " + SCENES[s].name + "  @ " + SCENES[s].start.toFixed(2) + "s\n";
        if (WARN.length) msg += "\nSettings that could not be applied (set by hand):\n  - " + WARN.join("\n  - ");
        $.writeln(msg);
        alert(msg);
    } catch (err) {
        alert("Build Origin Story failed:\n" + err.toString() + (err.line ? "\nLine: " + err.line : ""));
    } finally {
        app.endUndoGroup();
    }
})();
