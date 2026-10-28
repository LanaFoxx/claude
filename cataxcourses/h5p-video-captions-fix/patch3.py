# Captions fix v3 for H5P.Video youtube.js: start with captions off, offer YouTube's unlisted
# auto-generated track under the CC button, and load/unload YouTube's captions module on demand.
A_OLD = "              player.loadModule('captions');\n            }\n"
A_NEW = ("              player.loadModule('captions');\n"
         "\n"
         "              // California Tax Courses: YouTube switches its auto-generated captions on when this module\n"
         "              // loads and does not list them, so H5P showed no CC button. Start with captions off.\n"
         "              captionsOffPending = true;\n"
         "            }\n")
B_OLD = "            if (trackList && trackList.length) {\n"
B_NEW = ("            var currentTrack;\n"
         "            try {\n"
         "              currentTrack = player.getOption('captions', 'track');\n"
         "            }\n"
         "            catch (err) {}\n"
         "            if (currentTrack && currentTrack.languageCode && !autoCaptionsTrack) {\n"
         "              autoCaptionsTrack = currentTrack;\n"
         "            }\n"
         "            if (wantedCaptionsTrack) {\n"
         "              // A student picked a track while the module was loading.\n"
         "              try {\n"
         "                player.setOption('captions', 'track', wantedCaptionsTrack);\n"
         "              }\n"
         "              catch (err) {}\n"
         "              wantedCaptionsTrack = null;\n"
         "            }\n"
         "            else if (captionsOffPending && currentTrack && currentTrack.languageCode) {\n"
         "              captionsOffPending = false;\n"
         "              captionsOff = true;\n"
         "              try {\n"
         "                player.setOption('captions', 'track', {});\n"
         "                player.unloadModule('captions');\n"
         "              }\n"
         "              catch (err) {}\n"
         "            }\n"
         "            if ((!trackList || !trackList.length) && autoCaptionsTrack) {\n"
         "              trackList = [autoCaptionsTrack];\n"
         "            }\n"
         + B_OLD)
C_OLD = "    var playbackRate = 1;\n"
C_NEW = (C_OLD + "    // California Tax Courses captions state (see onApiChange and setCaptionsTrack).\n"
         "    var captionsOffPending = false;\n    var captionsOff = false;\n"
         "    var autoCaptionsTrack = null;\n    var wantedCaptionsTrack = null;\n")
D_OLD = ("    self.setCaptionsTrack = function (track) {\n"
         "      player.setOption('captions', 'track', track ? {languageCode: track.value} : {});\n"
         "    };\n")
D_NEW = ("    self.setCaptionsTrack = function (track) {\n"
         "      captionsOffPending = false;\n"
         "      if (!track) {\n"
         "        captionsOff = true;\n"
         "        player.setOption('captions', 'track', {});\n"
         "        try {\n"
         "          player.unloadModule('captions');\n"
         "        }\n"
         "        catch (err) {}\n"
         "        return;\n"
         "      }\n"
         "      if (captionsOff) {\n"
         "        // Captions module was unloaded; reload it and apply the track once YouTube is ready.\n"
         "        captionsOff = false;\n"
         "        wantedCaptionsTrack = {languageCode: track.value};\n"
         "        player.loadModule('captions');\n"
         "      }\n"
         "      player.setOption('captions', 'track', {languageCode: track.value});\n"
         "    };\n")
E_OLD = ("    self.getCaptionsTrack = function () {\n"
         "      var track = player.getOption('captions', 'track');\n")
E_NEW = ("    self.getCaptionsTrack = function () {\n"
         "      if (captionsOff) {\n"
         "        return null;\n"
         "      }\n"
         "      var track = player.getOption('captions', 'track');\n")
def apply(s):
    for o in (A_OLD, B_OLD, C_OLD, D_OLD, E_OLD):
        assert s.count(o) == 1, o[:60]
    return s.replace(C_OLD, C_NEW).replace(A_OLD, A_NEW).replace(B_OLD, B_NEW).replace(D_OLD, D_NEW).replace(E_OLD, E_NEW)

def apply_bundle(s):
    # The cached bundle concatenates every video handler; patch only the YouTube one.
    start = s.index('H5P.VideoYouTube = (function')
    end = s.index('H5P.videoHandlers.push(H5P.VideoYouTube)', start)
    return s[:start] + apply(s[start:end]) + s[end:]
