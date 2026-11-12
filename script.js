window.harpLibrary = [];
window.currentOctave = 0;
window.currentTranspose = 0;
// Sallitut sävelet D-pitkähuilulle
var harmonicOpen = [0, 7, 12, 16, 19, 22, 24];
var harmonicClosed = [4, 10, 14, 18, 21, 23];
var harmonicHalf = [6, 11, 15];

// Yhdistetty lista analyysiä varten
var allowedD = [...new Set(
  harmonicOpen.concat(harmonicClosed, harmonicHalf)
)];

var lastOriginalAbc = "";
var visualObj = null;
var synthControl = null;
var synth = null;      

// 1. Datan lataus (poistettu pyydetyt lähteet)
async function loadGistData() {
	var statusDiv = document.getElementById('loadingStatus');
    var urls = [
        { type: "Tarkistusnuotit", url: "tarkistusnuotit9.js" },
        { type: "Tarkistusnuotit", url: "korjaustsekki3.js" },
        { type: "Tarkistusnuotit", url: "richardrobinsonbook.js" },
        { type: "Tarkistusnuotit", url: "FinnishTunes.js" },
        { type: "Tarkistusnuotit", url: "sekalaista01.js" },
        { type: "Sessionsetit", url: "sessionSet01.js" },
        { type: "Sessionsetit", url: "sessionSet02.js" },
        { type: "Sessionsetit", url: "sessionSet03.js" },
        { type: "Sessionsetit", url: "sessionSet04.js" },
        { type: "Sessionsetit", url: "sessionSet05.js" },
        { type: "Sessionsetit", url: "sessionSet06.js" },
        { type: "Sessionsetit", url: "sessionSet07.js" },
        { type: "Sessionsetit", url: "sessionSet08.js" },
        { type: "Sessionsetit", url: "sessionSet09.js" },
        { type: "Sessionsetit", url: "sessionSet10.js" },
        { type: "Sessionsetit", url: "sessionSet11.js" },
        { type: "Sessionsetit", url: "sessionSet12.js" },
        { type: "Sessionsetit", url: "sessionSet13.js" },
        { type: "Sessionsetit", url: "sessionSet14.js" },
        { type: "Sessionsetit", url: "sessionSet15.js" },
        { type: "Sessionsetit", url: "sessionSet16.js" },
        { type: "Sessionsetit", url: "sessionSet17.js" },
        { type: "Sessionsetit", url: "sessionSet18.js" },
        { type: "Tarkistusnuotit", url: "extrasetti5.js" },
        { type: "Melnets", url: "melnets_part1.js" },
        { type: "Melnets", url: "melnets_part2.js" },
        { type: "Melnets", url: "melnets_part3.js" },
        { type: "Melnets", url: "melnets_part4.js" },
        { type: "Melnets", url: "melnets_part5.js" },
        { type: "Melnets", url: "melnets_part6.js" },
        { type: "Melnets", url: "melnets_part7.js" },
        { type: "Melnets", url: "melnets_part8.js" },
        { type: "Sekalaiset", url: "esavelmat_hs1.js" },
        { type: "Sekalaiset", url: "esavelmat_ls1.js" },
        { type: "Sekalaiset", url: "esavelmat_ls2.js" },
        { type: "Sekalaiset", url: "esavelmat_ls3.js" },
        { type: "Sekalaiset", url: "esavelmat_ls4.js" },
        { type: "Sekalaiset", url: "FinnishTunes2.js" },
        { type: "Sekalaiset", url: "swedish2.js" },
        { type: "Sekalaiset", url: "norway1.js" },
        { type: "Sekalaiset", url: "dansk1.js" },
        { type: "Sekalaiset", url: "dansk2.js" },
        { type: "Sekalaiset", url: "dansk3.js" },
        { type: "Sekalaiset", url: "nordbeck.js" },
        { type: "Sekalaiset", url: "richardrobinsonbook.js" },
        { type: "Sekalaiset", url: "abctransposer1.js" },
        { type: "Sekalaiset", url: "own.js" }
    ];

    for (var i = 0; i < urls.length; i++) {  
        try {  
            if (statusDiv) {
                statusDiv.innerText = "Ladataan tiedostoa " + (i + 1) + "/" + urls.length + ": " + urls[i].url;
            }
            var response = await fetch(urls[i].url);
            if (!response.ok) throw new Error("Palvelin vastasi: " + response.status);  
            var text = await response.text();  
            var startIdx = text.indexOf('[');  
            var endIdx = text.lastIndexOf(']');  
            
            if (startIdx !== -1 && endIdx !== -1) {  
                var rawList = text.substring(startIdx, endIdx + 1);  
                var data = new Function('return ' + rawList)();  
                
                if (Array.isArray(data)) {
                    data.forEach(item => {
                        item.sourceGroup = urls[i].type;
                        item.abc = item.abc || item.notation || item.content || "";
                    });
                    window.harpLibrary = window.harpLibrary.concat(data);
                }  
            }  
        } catch (err) { 
            console.error("Latausvirhe linkissä: " + urls[i].url, err); 
        }  
    }
    if (statusDiv) {
        statusDiv.innerText = "✅ Kaikki " + window.harpLibrary.length + " kappaletta ladattu!";
        setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);
    }
    console.log("KAIKKI LADATTU:", window.harpLibrary.length);
}

loadGistData();

window.onload = function() {
var abcInput = document.getElementById('abcInput');
var warningDiv = document.getElementById('warnings');
var octaveDisplay = document.getElementById('octaveDisplay');
var transposeDisplay = document.getElementById('transposeDisplay');
var tempoSlider = document.getElementById('tempoSlider');
var tempoDisplay = document.getElementById('tempoDisplay');
var resultsDiv = document.getElementById('searchResults');
var baseNoteSelect = document.getElementById('baseNote');

function getPitchValue(noteName) {  
    var baseMap = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };  
    var val = baseMap[noteName.toUpperCase()] || 0;  
    if (noteName === noteName.toLowerCase()) val += 12;   
    return val;  
}  

function getFilteredLibrary() {
    var filterValue = document.getElementById('sourceFilter').value;
    if (filterValue === "Kaikki") return window.harpLibrary;
    return window.harpLibrary.filter(item => item.sourceGroup === filterValue);
}

function getRelativeMajor(root, mode){
    var semitones = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};
    var reverse = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];

    var val = semitones[root];
    if (val === undefined) return root;
    if (mode.includes("min") || mode === "m") val += 3;
    if (mode.includes("dor")) val -= 2;
    if (mode.includes("mix")) val -= 7;
    if (mode.includes("lyd")) val -= 5;

    val = (val + 120) % 12;
    return reverse[val];
}
  
function getKeyAccidentals(key, mode) {
    mode = (mode || "").toLowerCase().trim();
    var k = key.toUpperCase();
    var relativeMajorKey = getRelativeMajor(k, mode);
    
    var accidentals = {};
    var sharpsOrder = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
    var flatsOrder = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

    var sharpCounts = { 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6, 'C#': 7 };
    var flatCounts = { 'F': 1, 'Bb': 2, 'Eb': 3, 'Ab': 4, 'Db': 5, 'Gb': 6, 'Cb': 7 };

    if (sharpCounts[relativeMajorKey]) {
        for (var i = 0; i < sharpCounts[relativeMajorKey]; i++) {
            accidentals[sharpsOrder[i]] = 1;
        }
    } else if (flatCounts[relativeMajorKey]) {
        for (var i = 0; i < flatCounts[relativeMajorKey]; i++) {
            accidentals[flatsOrder[i]] = -1;
        }
    }
    return accidentals;
}

function getOriginalHarpKey() {
    var notes = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    var defaultPitch = 2; 
    var trans = window.currentTranspose || 0;
    var originalPitch = ((defaultPitch - trans) % 12 + 12) % 12;
    return notes[originalPitch];
}

function getTargetTranspositions(mode) {
    var targets = [];
    mode = mode.toLowerCase();

    if (mode.includes("lyd") && !mode.includes("mix")) {
        targets = [2];
    } else if (mode.includes("mix")) {
        targets = [4];
    } else if (mode.includes("dor")) {
        targets = [9, 7]; 
    } else if (mode.includes("min") || mode === "m") {
        targets = [2, 9, 11]; 
    } else {
        targets = [2, 9]; 
    }
    return targets;
}

function autoTransposeFromKey(abc) {
    var keyMatch = abc.match(/^K:\s*([A-G][b#]?)\s*([a-zA-Z]*)/m);
    if (!keyMatch) return;

    var semitones = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};
    var startNote = keyMatch[1];
    var mode = (keyMatch[2] || "").toLowerCase().trim();
    var startVal = semitones[startNote] || 0;
    var targets = getTargetTranspositions(mode);

    var bestScore = 999;
    var bestOct = 0;
    var bestTrans = 0;

    targets.forEach(targetVal => {
        var transOptions = [
            targetVal - startVal,          
            (targetVal - startVal) + 12,   
            (targetVal - startVal) - 12    
        ];

        transOptions.forEach(trans => {
            [-1, 0, 1].forEach(oct => {
                var rate = countErrorRate(abc, trans, oct);
                var penalty = ((oct + 1) * 0.1) + (Math.abs(trans) * 0.01);
                if (targetVal === 2) penalty -= 0.05; 
                var currentScore = rate + penalty;
                
                if (currentScore < bestScore) {
                    bestScore = currentScore;
                    bestOct = oct;
                    bestTrans = trans;
                }
            });
        });
    });

    window.currentOctave = bestOct;
    window.currentTranspose = bestTrans;
}

function processAbc() {
    var raw = abcInput.value;
    var songName = "Pitkahuilukappale"; 
    var titleMatch = raw.match(/^T:\s*(.*)/m);
    if (titleMatch && titleMatch[1].trim() !== "") {
        songName = titleMatch[1].trim().replace(/[\/\\:\*\?"<>\|]/g, "_");
    }
    document.title = songName;
	
    var baseShift = 2; 

    if (octaveDisplay) octaveDisplay.innerText = window.currentOctave;  
    if (transposeDisplay) transposeDisplay.innerText = window.currentTranspose;  
    if (tempoDisplay) tempoDisplay.innerText = tempoSlider.value;  
      
    var hasErrors = false;  
    var finalAbc = "";  

    var allowedD = harmonicOpen.concat(harmonicClosed).concat(harmonicHalf);
    
    var keyAccidentals = {}; 
    var barAccidentals = {}; 
      
    var lines = raw.split('\n');  
    for (var i = 0; i < lines.length; i++) {  
        // POISTETAAN RIVIN LOPUN KENOVIIVA ( \ ) automaattisesti, ettei tabulatuurit/w-rivit mene rikki
        var line = lines[i].replace(/\\\s*$/, '');  
        
        if (line.trim().startsWith('w:')) continue;  
          
        if (/^[A-Z]:/.test(line) && !line.startsWith('|:')) {  
            if (line.startsWith("Q:")) {
                finalAbc += "Q:1/4=" + tempoSlider.value + "\n";
                continue;
            }  
            if (line.startsWith('K:')) {  
                var keyMatch = line.match(/^K:\s*([A-G][b#]?)\s*(.*)/i);  
                if (keyMatch) {
                    var keyBase = keyMatch[1];         
                    var modeStr = keyMatch[2].trim();   
                    keyAccidentals = getKeyAccidentals(keyBase, modeStr);
                }  
                finalAbc += line.trim() + " octave=" + window.currentOctave + "\n";
            } else {
                finalAbc += line + "\n";
            }
            continue;
        }

        var wLine = "w:";  
        var foundNotes = false;  
        var noteRegex = /([|])|([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g;  
        var match;  
          
        while ((match = noteRegex.exec(line)) !== null) {  
            foundNotes = true;  
            if (match[1] === '|') {
                barAccidentals = {};
                continue; 
            }
            
            var acc = match[2]; 
            var noteName = match[3]; 
            var octs = match[4];  
            var v = getPitchValue(noteName);  
            var stepInOctave = noteName.toUpperCase();

            if (acc === '^') {
                v++;
                barAccidentals[stepInOctave] = 1;
            } else if (acc === '_') {
                v--;
                barAccidentals[stepInOctave] = -1;
            } else if (acc === '=') {
                barAccidentals[stepInOctave] = 0;
            } else {
                if (barAccidentals.hasOwnProperty(stepInOctave)) {
                    v += barAccidentals[stepInOctave];
                } else if (keyAccidentals[stepInOctave]) {
                    v += keyAccidentals[stepInOctave];
                }
            }  

            for (var j = 0; j < octs.length; j++) {  
                if (octs[j] === ',') v -= 12; 
                if (octs[j] === "'") v += 12;  
            }  
              
            var step = v + (window.currentOctave * 12) + window.currentTranspose - baseShift;  
            var sym = "×";  
            if (harmonicOpen.indexOf(step) !== -1) sym = "◯";  
            else if (harmonicClosed.indexOf(step) !== -1) sym = "⬤";  
            else if (harmonicHalf.indexOf(step) !== -1) sym = "◒";  

            if (sym === "×") hasErrors = true;  
            wLine += " " + sym;  
        }  
        finalAbc += line + "\n";  
        if (foundNotes) finalAbc += wLine + "\n";  
    }  

    if (!finalAbc.includes("Q:")) {
        finalAbc = finalAbc.replace(/M:[^\n]*/, function(m){
            return m + "\nQ:1/4=" + tempoSlider.value;
        });
    }

    var originalKeyDisplay = document.getElementById('originalKeyDisplay');
    if (originalKeyDisplay) {
        var harpKey = getOriginalHarpKey();
        var trans = window.currentTranspose || 0;
        
        if (trans !== 0) {
            var transStr = trans > 0 ? "+" + trans : trans;
            originalKeyDisplay.innerText = `Alkuperäinen sävellaji: vaatisi ilman transponointia ${harpKey}-pitkähuilun (transponoitu ${transStr} puoliaskelta)`;
        } else {
            originalKeyDisplay.innerText = "Alkuperäinen sävellaji: D-pitkähuilu (ei transponointia)";
        }
    }

    if (window.ABCJS) {  
        visualObj = ABCJS.renderAbc("paper", finalAbc, {  
            responsive: 'resize',  
            scale: 0.8,          
            staffwidth: 740, 
            paddingbottom: 0,   
            paddingtop: 20,      
            add_classes: true,  
            visualTranspose: window.currentTranspose,  
            boostOctave: window.currentOctave,  
            wrap: {
                minSpacing: 1.5,
                maxSpacing: 2.5,
                preferredMeasuresPerLine: 4 
            }
        })[0];  

        if (synthControl && visualObj) {  
            var audioParams = window.getAudioOptions();
            var ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioParams.program === 73) {
                var realDestination = ctx.destination;
                var masterBus = ctx.createGain(); 
                var convolver = ctx.createConvolver();
                var reverbGain = ctx.createGain();
                reverbGain.gain.value = 0.6; 
                
                var rate = ctx.sampleRate;
                var length = rate * 2.5; 
                var impulse = ctx.createBuffer(2, length, rate);
                var left = impulse.getChannelData(0);
                var right = impulse.getChannelData(1);
                for (var i = 0; i < length; i++) {
                    var decay = Math.exp(-i / (rate * 0.8)); 
                    left[i] = (Math.random() * 2 - 1) * decay;
                    right[i] = (Math.random() * 2 - 1) * decay;
                }
                convolver.buffer = impulse;

                masterBus.connect(realDestination);      
                masterBus.connect(convolver);            
                convolver.connect(reverbGain);           
                reverbGain.connect(realDestination);     

                Object.defineProperty(ctx, 'destination', {
                    value: masterBus,
                    writable: false
                });
            }
            
            synth.init({  
                audioContext: ctx,  
                visualObj: visualObj,
                options: audioParams 
            }).then(function() {  
                synthControl.setTune(visualObj, true, audioParams).then(function() {
                    synthControl.restart(); 
                });  
            }).catch(function(err) {
                console.warn("Soittimen alustus odottaa klikkausta:", err);
            });
        }
    }
    if (warningDiv) {
        warningDiv.innerHTML = hasErrors ? "⚠️ Sisältää outoja säveliä" : "✅ Kaikki sävelet sopivat huilulle";
    }
    updateAbcDownload(finalAbc);
}

document.getElementById('octaveUp').onclick = function() { window.currentOctave++; processAbc(); };  
document.getElementById('octaveDown').onclick = function() { window.currentOctave--; processAbc(); };  
document.getElementById('transposeUp').onclick = function() { window.currentTranspose++; processAbc(); };  
document.getElementById('transposeDown').onclick = function() { window.currentTranspose--; processAbc(); };  
if (baseNoteSelect) baseNoteSelect.onchange = processAbc;   

function replaceTransposedNotesSmart(conditionFn, shiftFn) {
    var abcInput = document.getElementById('abcInput');
    if (!abcInput) return;
    
    window.lastOriginalAbc = abcInput.value;
    if (typeof showUndo === "function") showUndo();

    var pitchNames = ['C','^C','D','^D','E','F','^F','G','^G','A','^A','B'];
    var lines = abcInput.value.split('\n');

    var fixedLines = lines.map(function(line) {
        if (/^[A-Z]:/.test(line) || line.trim().startsWith('w:')) return line;

        return line.replace(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g, function(match, acc, note, octs, dur) {
            var v = getPitchValue(note);
            if (acc === '^') v++;
            if (acc === '_') v--;
            for (var j = 0; j < octs.length; j++) {
                if (octs[j] === ',') v -= 12;
                if (octs[j] === "'") v += 12;
            }
            
            var currentTransposedStep = v + (window.currentOctave * 12) + window.currentTranspose - 2;
            var pitchClass = ((currentTransposedStep % 12) + 12) % 12;

            if (conditionFn(currentTransposedStep, pitchClass, note, octs)) {
                var newTransposedStep = shiftFn(currentTransposedStep, pitchClass, note, octs);
                var newPitch = (newTransposedStep + 2) - (window.currentOctave * 12) - window.currentTranspose;
                var absPitch = ((newPitch % 12) + 12) % 12;
                var octShift = Math.floor(newPitch / 12);
                var rawName = pitchNames[absPitch];
                
                var finalAcc = "";
                if (rawName.startsWith('^')) { 
                    finalAcc = "^"; 
                    rawName = rawName.substring(1); 
                } else {
                    if (acc === '_' || acc === '^') finalAcc = "=";
                }
                
                if (octShift > 0) { 
                    rawName = rawName.toLowerCase(); 
                    octShift--; 
                }
                var octaveMarks = (octShift > 0) ? "'".repeat(octShift) : (octShift < 0 ? ",".repeat(Math.abs(octShift)) : "");
                
                return finalAcc + rawName + octaveMarks + dur;
            }
            return match; 
        });
    });

    abcInput.value = fixedLines.join('\n');
    if (typeof processAbc === "function") processAbc();
}

const btnBtoA = document.getElementById('fixBtoA');
if (btnBtoA) {
    btnBtoA.onclick = function() { 
        replaceTransposedNotesSmart(
            function(step, pClass) { return (pClass === 8 || pClass === 9) && step >= 0 && step < 12; },
            function(step, pClass) { return pClass === 9 ? step - 2 : step - 1; }
        );
    };
}

const btnBtoD = document.getElementById('fixBtoD');
if (btnBtoD) {
    btnBtoD.onclick = function() { 
        replaceTransposedNotesSmart(
            function(step, pClass) { return (pClass === 8 || pClass === 9) && step >= 0 && step < 12; },
            function(step, pClass) { return pClass === 9 ? step + 3 : step + 4; }
        );
    };
}

const btnGtoGsharp = document.getElementById('fixGtoGsharp');
if (btnGtoGsharp) {
    btnGtoGsharp.onclick = function() { 
        replaceTransposedNotesSmart(
            function(step, pClass) { return pClass === 5; },
            function(step, pClass) { return step + 1; }
        );
    };
}

document.getElementById('randomStrictLimitedBtn').onclick = function() {
    hideUndo();
    randomStrictSearchLimited();
};

document.getElementById('searchBtn').onclick = function() { 
    hideUndo();
    smartSearch(false); 
};
  
var randomStrictBtn = document.getElementById('randomStrictBtn');
if (randomStrictBtn) {
    randomStrictBtn.onclick = function() {
        hideUndo();
        randomStrictSearch();
    };
}
  
document.getElementById('randomBtn').onclick = function() {   
    hideUndo();
    smartSearch(true);
};

document.getElementById('printBtn').onclick = function() {
    window.print();
};

var errorRateSlider = document.getElementById('errorRateSlider');
var errorValDisplay = document.getElementById('errorValDisplay');

if (errorRateSlider && errorValDisplay) {
    errorRateSlider.oninput = function() {
        errorValDisplay.innerText = this.value;
    };
}

document.getElementById('randomStrictFixBtn').onclick = function() {
    hideUndo();
    randomStrictSearchLimited();
    setTimeout(function() {
        var abcInput = document.getElementById('abcInput');
        lastOriginalAbc = abcInput.value;
        var fixBtn = document.getElementById('fixNotesBtn2');
        if (fixBtn) {
            fixBtn.onclick();
        }
        if (typeof processAbc === "function") processAbc();

        if (document.body.classList.contains('focus-mode')) {
            setTimeout(function() {
                if (synthControl) {
                    synthControl.play();
                }
            }, 100);
        }
    }, 70); 
};

function getSafeFavorites() {
    try {
        var data = JSON.parse(localStorage.getItem('harpFavorites') || '[]');
        return Array.isArray(data) ? data : [];
    } catch(e) {
        console.error("Suosikkien luku epäonnistui, nollataan lista.");
        return [];
    }
}

document.getElementById('addFavBtn').onclick = function() {
    var currentName = "Nimetön kappale";
    var titleMatch = abcInput.value.match(/^T:\s*(.*)/m);
    if (titleMatch) currentName = titleMatch[1].trim();

    var favorites = getSafeFavorites();
    if (favorites.some(f => f.abc === abcInput.value)) {
        alert("Kappale on jo suosikeissasi!");
        return;
    }

    favorites.push({
        name: currentName,
        abc: abcInput.value,
        trans: window.currentTranspose || 0,
        oct: window.currentOctave || 0
    });

    localStorage.setItem('harpFavorites', JSON.stringify(favorites));
    alert("⭐ Tallennettu suosikkeihin!");
};

document.getElementById('remFavBtn').onclick = function() {
    var favorites = getSafeFavorites();
    var initialLength = favorites.length;
    favorites = favorites.filter(f => f.abc !== abcInput.value);

    if (favorites.length === initialLength) {
        alert("Tätä kappaletta ei löytynyt suosikeista.");
    } else {
        localStorage.setItem('harpFavorites', JSON.stringify(favorites));
        alert("🗑️ Poistettu suosikeista.");
    }
};

document.getElementById('showFavsBtn').onclick = function() {
    hideUndo();
    var favorites = getSafeFavorites();
    var resultsDiv = document.getElementById('searchResults');
    
    if (favorites.length === 0) {
        resultsDiv.innerHTML = "<div style='padding:20px;'>Suosikkilistasi on tyhjä.</div>";
        resultsDiv.style.display = "block";
        return;
    }

    var formattedFavs = favorites.map(f => ({
        item: { 
            name: "⭐ " + (f.name || "Nimetön"), 
            abc: f.abc 
        },
        trans: f.trans || 0,
        oct: f.oct || 0,
        info: "Suosikki"
    }));

    resultsDiv.style.display = "block";
    renderResults(formattedFavs);
};

tempoSlider.oninput = processAbc;  
abcInput.oninput = processAbc;  
  
window.undoFix = function() {
    if (lastOriginalAbc) {
        document.getElementById('abcInput').value = lastOriginalAbc;
        processAbc(); 
        document.getElementById('undoBtn').style.display = 'none'; 
    }
};

document.getElementById('undoBtn').onclick = window.undoFix;

function showUndo() {
    var btn = document.getElementById('undoBtn');
    if (btn) btn.style.display = 'inline-block';
}

function hideUndo() {
    var btn = document.getElementById('undoBtn');
    if (btn) btn.style.display = 'none';
}

document.getElementById('fixNotesBtn').onclick = function() {  
    lastOriginalAbc = abcInput.value; 
    showUndo(); 

    var playable = allowedD; 
    var pitchNames = ['C','^C','D','^D','E','F','^F','G','^G','A','^A','B'];  
    var lines = abcInput.value.split('\n');  

    var fixedLines = lines.map(function(line){  
        if (/^[A-Z]:/.test(line) || line.trim().startsWith('w:')) return line;  

        return line.replace(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g,  
        function(match, acc, note, octs, dur){  
            var v = getPitchValue(note);  
            if (acc === '^') v++;  
            if (acc === '_') v--;  

            for (var j=0;j<octs.length;j++){  
                if (octs[j]===',') v-=12;  
                if (octs[j]==="'") v+=12;  
            }  

            var step = v + (window.currentOctave*12) + window.currentTranspose - 2;

            if (step === 17) {
                return "^g" + dur;
            }

            if (playable.indexOf(step) !== -1) return match;  

            var nearest = playable.reduce(function(prev,curr){  
                return Math.abs(curr-step) < Math.abs(prev-step) ? curr : prev;  
            });  

            var newPitch = (nearest + 2) - (window.currentOctave*12) - window.currentTranspose;  
            var octave = Math.floor(newPitch/12);  
            var pitch = ((newPitch%12)+12)%12;  
            var noteName = pitchNames[pitch];  
            var octaveMarks = "";  

            if (octave > 0) octaveMarks = "'".repeat(octave);  
            if (octave < 0) octaveMarks = ",".repeat(-octave);  

            return noteName + octaveMarks + dur;  
        });  
    });  

    abcInput.value = fixedLines.join('\n');  
    processAbc();
};

document.getElementById('fixNotesBtn2').onclick = function() {
    lastOriginalAbc = document.getElementById('abcInput').value;
    showUndo();
    
    var abcInput = document.getElementById('abcInput');
    var playable = allowedD;
    var pitchNames = ['C','^C','D','^D','E','F','^F','G','^G','A','^A','B'];
    var lines = abcInput.value.split('\n');
    
    var allNotesTransposed = [];
    lines.forEach(line => {
        if (/^[A-Z]:/.test(line) || line.trim().startsWith('w:')) return;
        var m;
        var noteRegex = /([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g;
        while ((m = noteRegex.exec(line)) !== null) {
            var v = getPitchValue(m[2]);
            if (m[1] === '^') v++;
            if (m[1] === '_') v--;
            for (var j=0; j<m[3].length; j++){
                if (m[3][j] === ',') v -= 12;
                if (m[3][j] === "'") v += 12;
            }
            allNotesTransposed.push(v + (window.currentOctave*12) + window.currentTranspose - 2);
        }
    });

    var globalNoteCounter = 0;
    var lastStep = null;

    var fixedLines = lines.map(function(line){
        if (/^[A-Z]:/.test(line) || line.trim().startsWith('w:')) return line;

        return line.replace(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g, function(match, acc, note, octs, dur){
            var v = getPitchValue(note);
            if (acc === '^') v++;
            if (acc === '_') v--;
            for (var j=0; j<octs.length; j++){
                if (octs[j] === ',') v -= 12;
                if (octs[j] === "'") v += 12;
            }

            var step = v + (window.currentOctave*12) + window.currentTranspose - 2;
            var nextStepInSong = allNotesTransposed[globalNoteCounter + 1];
            globalNoteCounter++;

            if (playable.indexOf(step) !== -1) {
                lastStep = step;
                return match;
            }

            var bestReplacement = playable.reduce(function(prev, curr) {
                var scorePrev = Math.abs(prev - step);
                var scoreCurr = Math.abs(curr - step);

                if (lastStep !== null) {
                    var originalDir = step - lastStep; 
                    var newDir = curr - lastStep;
                    if ((originalDir > 0 && newDir > 0) || (originalDir < 0 && newDir < 0)) scoreCurr -= 1.0;
                }

                if (nextStepInSong !== undefined && curr === nextStepInSong) {
                    if (step !== nextStepInSong) scoreCurr += 10.0; 
                }

                if (curr % 12 === 7) scoreCurr -= 1.0; 
                if (curr % 12 === 0) scoreCurr -= 0.8; 
                if (curr % 12 === 8 || curr % 12 === 1) scoreCurr += 1.5;

                return scoreCurr < scorePrev ? curr : prev;
            });

            lastStep = bestReplacement;

            var newPitch = (bestReplacement + 2) - (window.currentOctave*12) - window.currentTranspose;
            var absPitch = ((newPitch % 12) + 12) % 12;
            var octShift = Math.floor(newPitch / 12);
            var rawName = pitchNames[absPitch];
            
            var finalAcc = "";
            if (rawName.startsWith('^')) { finalAcc = "^"; rawName = rawName.substring(1); }
            
            if (octShift > 0) {
                rawName = rawName.toLowerCase();
                octShift--;
            }
            var octaveMarks = (octShift > 0) ? "'".repeat(octShift) : (octShift < 0 ? ",".repeat(Math.abs(octShift)) : "");
            
            return finalAcc + rawName + octaveMarks + dur;
        });
    });

    abcInput.value = fixedLines.join('\n');
    if (typeof processAbc === "function") processAbc();
};

document.getElementById('fixNotesBtn3').onclick = function() {
    lastOriginalAbc = document.getElementById('abcInput').value;
    showUndo();
    
    var abcInput = document.getElementById('abcInput');
    var playable = allowedD;
    var pitchNames = ['C','^C','D','^D','E','F','^F','G','^G','A','^A','B'];
    var lines = abcInput.value.split('\n');
    
    var allNotesTransposed = [];
    lines.forEach(line => {
        if (/^[A-Z]:/.test(line) || line.trim().startsWith('w:')) return;
        var m;
        var noteRegex = /([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g;
        while ((m = noteRegex.exec(line)) !== null) {
            var v = getPitchValue(m[2]);
            if (m[1] === '^') v++;
            if (m[1] === '_') v--;
            for (var j=0; j<m[3].length; j++){
                if (m[3][j] === ',') v -= 12;
                if (m[3][j] === "'") v += 12;
            }
            allNotesTransposed.push(v + (window.currentOctave*12) + window.currentTranspose - 2);
        }
    });

    var globalNoteCounter = 0;
    var lastStep = null;

    var fixedLines = lines.map(function(line){
        if (/^[A-Z]:/.test(line) || line.trim().startsWith('w:')) return line;

        return line.replace(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g, function(match, acc, note, octs, dur){
            var v = getPitchValue(note);
            if (acc === '^') v++;
            if (acc === '_') v--;
            
            for (var j=0; j<octs.length; j++){
                if (octs[j] === ',') v -= 12;
                if (octs[j] === "'") v += 12;
            }

            var step = v + (window.currentOctave*12) + window.currentTranspose - 2;
            var nextStepInSong = allNotesTransposed[globalNoteCounter + 1];
            globalNoteCounter++;
            
            if (step === 11) step = 10;
            if (step === 5) step = 6;

            if (playable.indexOf(step) !== -1) {
                lastStep = step;
                return convertToAbc(step, dur, pitchNames);
            }

            var bestReplacement = playable.reduce(function(prev, curr) {
                var scorePrev = Math.abs(prev - step);
                var scoreCurr = Math.abs(curr - step);
                
                if (lastStep !== null) {
                    var originalDir = step - lastStep; 
                    var newDir = curr - lastStep;
                    if ((originalDir > 0 && newDir > 0) || (originalDir < 0 && newDir < 0)) scoreCurr -= 1.0;
                }
                
                if (nextStepInSong !== undefined && curr === nextStepInSong) {
                    if (step !== nextStepInSong) scoreCurr += 10.0;
                }
                
                if (curr % 12 === 7) scoreCurr -= 1.0; 
                if (curr % 12 === 0) scoreCurr -= 0.8; 
                if (curr % 12 === 8 || curr % 12 === 1) scoreCurr += 1.5;
                
                return scoreCurr < scorePrev ? curr : prev;
            });

            lastStep = bestReplacement;
            return convertToAbc(bestReplacement, dur, pitchNames);
        });
    });

    function convertToAbc(pitchNum, dur, names) {
        var newPitch = (pitchNum + 2) - (window.currentOctave*12) - window.currentTranspose;
        var absPitch = ((newPitch % 12) + 12) % 12;
        var octShift = Math.floor(newPitch / 12);
        var rawName = names[absPitch];
        var finalAcc = "";
        
        if (rawName === 'C') finalAcc = "=";
        if (rawName === 'G') finalAcc = "="; 
        
        if (rawName.startsWith('^')) { finalAcc = "^"; rawName = rawName.substring(1); }
        if (octShift > 0) { rawName = rawName.toLowerCase(); octShift--; }
        var octaveMarks = (octShift > 0) ? "'".repeat(octShift) : (octShift < 0 ? ",".repeat(Math.abs(octShift)) : "");
        
        return finalAcc + rawName + octaveMarks + dur;
    }

    abcInput.value = fixedLines.join('\n');
    processAbc();
};

function smartSearch(isRandom) {
    var query = document.getElementById('searchInput').value.toLowerCase().trim();
    resultsDiv.innerHTML = "Analysoidaan...";
    resultsDiv.style.display = "block";

    var candidates = getFilteredLibrary();
    
    if (isRandom) {
        candidates = [candidates[Math.floor(Math.random() * candidates.length)]];
    } else if (query !== "") {
        candidates = candidates.filter(function(f) {
            var abc = f.abc || f.notation || f.content || "";
            var title  = (abc.match(/^T:\s*(.*)/m) || ["", ""])[1].toLowerCase();
            var origin = (abc.match(/^O:\s*(.*)/m) || ["", ""])[1].toLowerCase();
            var rhythm = (abc.match(/^R:\s*(.*)/m) || ["", ""])[1].toLowerCase();
            var source = (abc.match(/^S:\s*(.*)/m) || ["", ""])[1].toLowerCase();
            
            return title.includes(query) || origin.includes(query) || rhythm.includes(query) || source.includes(query);
        });
    }

    var filtered = [];
    var semitones = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};

    for (var i = 0; i < candidates.length; i++) {
        var item = candidates[i];
        if (!item) continue;
        
        var abc = item.abc || item.notation || item.content || "";
        var keyMatch = abc.match(/^K:\s*([A-G][b#]?)\s*([a-zA-Z]*)/m);
        if (!keyMatch) continue;

        var startNote = keyMatch[1];
        var mode = (keyMatch[2] || "").toLowerCase().trim();
        var startVal = semitones[startNote] || 0;
        var targets = getTargetTranspositions(mode);
        var bestScore = { rate: 1.1, oct: 0, trans: 0 };

        targets.forEach(function(targetVal) {
            var transOptions = [targetVal - startVal, (targetVal - startVal) + 12, (targetVal - startVal) - 12];
            transOptions.forEach(function(trans) {
                [-1, 0, 1].forEach(function(oct) {
                    var rate = countErrorRate(abc, trans, oct);
                    if (rate < bestScore.rate) {
                        bestScore = { rate: rate, oct: oct, trans: trans };
                    }
                });
            });
        });

        if (bestScore.rate < 0.5) {  
            filtered.push({ item: item, oct: bestScore.oct, trans: bestScore.trans });
        }

        if (!isRandom && filtered.length > 40) break;
    }
    renderResults(filtered);
}

var searchStrictLimitedBtn = document.getElementById('searchStrictLimitedBtn');
if (searchStrictLimitedBtn) {
    searchStrictLimitedBtn.onclick = function() {
        hideUndo();
        searchWithSliderLimit();
    };
}

function searchWithSliderLimit() {
    var query = document.getElementById('searchInput').value.toLowerCase().trim();
    var resultsDiv = document.getElementById('searchResults');
    var slider = document.getElementById('errorRateSlider');
    var allowedErrorThreshold = slider ? (parseFloat(slider.value) / 100) : 0.1;

    resultsDiv.innerHTML = "Etsitään (max " + (allowedErrorThreshold * 100).toFixed(0) + "% virheitä)...";
    resultsDiv.style.display = "block";

    setTimeout(function() {
        var candidates = getFilteredLibrary();
        if (query !== "") {
            candidates = candidates.filter(function(f) {
                var abc = f.abc || f.notation || f.content || "";
                var title = (abc.match(/^T:\s*(.*)/m) || ["", ""])[1].toLowerCase();
                var origin = (abc.match(/^O:\s*(.*)/m) || ["", ""])[1].toLowerCase();
                return title.includes(query) || origin.includes(query);
            });
        }

        var filtered = [];
        var semitones = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};
        var resultCounter = 1; 

        for (var i = 0; i < candidates.length; i++) {
            var item = candidates[i];
            if (!item) continue;

            var abc = item.abc || item.notation || item.content || "";
            var keyMatch = abc.match(/^K:\s*([A-G][b#]?)\s*([a-zA-Z]*)/m);
            if (!keyMatch) continue;

            var startNote = keyMatch[1];
            var mode = (keyMatch[2] || "").toLowerCase().trim();
            var startVal = semitones[startNote] || 0;
            var targets = getTargetTranspositions(mode);
            var bestScore = { rate: 1.1, oct: 0, trans: 0 }; 

            targets.forEach(function(targetVal) {
                var transOptions = [targetVal - startVal, (targetVal - startVal) + 12, (targetVal - startVal) - 12];
                transOptions.forEach(function(trans) {
                    [-1, 0, 1].forEach(function(oct) {
                        var rate = countErrorRate(abc, trans, oct);
                        if (rate < bestScore.rate) {
                            bestScore = { rate: rate, oct: oct, trans: trans };
                        }
                    });
                });
            });

            if (bestScore.rate <= allowedErrorThreshold) {
                var titleMatch = abc.match(/^T:\s*(.*)/m);
                var originMatch = abc.match(/^O:\s*(.*)/m);
                
                var originalTitle = titleMatch ? titleMatch[1].trim() : "Nimetön kappale";
                var origin = originMatch ? " (" + originMatch[1].trim() + ")" : "";
                var displayTitle = resultCounter + ". " + originalTitle + origin + " (" + (bestScore.rate * 100).toFixed(0) + " %)";
                
                filtered.push({ 
                    item: { name: displayTitle, abc: abc }, 
                    oct: bestScore.oct, 
                    trans: bestScore.trans 
                });
                resultCounter++;
            }
            if (filtered.length >= 200) break;
        }

        renderResults(filtered);
        
        if (filtered.length > 0) {
            var addAllBtn = document.createElement('button');
            addAllBtn.innerHTML = "⭐ Lisää kaikki hakutulokset suosikkeihin";
            addAllBtn.className = "add-all-favorites-btn"; 
            addAllBtn.style = "display: block; width: 100%; margin: 10px 0; padding: 10px; background: #ffc107; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;";
            
            addAllBtn.onclick = function() {
                addAllResultsToFavorites(filtered);
            };
            resultsDiv.insertBefore(addAllBtn, resultsDiv.firstChild);
        }
    }, 50);
}

function addAllResultsToFavorites(results) {
    if (!results || results.length === 0) return;

    var favorites = (typeof getSafeFavorites === "function") 
        ? getSafeFavorites() 
        : JSON.parse(localStorage.getItem('harpFavorites') || '[]');
    
    var addedCount = 0;

    results.forEach(function(res) {
        var abcContent = res.item.abc;
        if (!favorites.some(f => f.abc === abcContent)) {
            var currentName = "Nimetön kappale";
            var titleMatch = abcContent.match(/^T:\s*(.*)/m);
            if (titleMatch) currentName = titleMatch[1].trim();

            favorites.push({
                name: currentName,
                abc: abcContent,
                trans: res.trans || 0, 
                oct: res.oct || 0      
            });
            addedCount++;
        }
    });

    localStorage.setItem('harpFavorites', JSON.stringify(favorites));
    if (addedCount > 0) {
        alert("⭐ Lisätty " + addedCount + " uutta kappaletta suosikkeihin!");
    } else {
        alert("Kaikki kappaleet olivat jo suosikeissasi.");
    }
}

var searchStrictC3Btn = document.getElementById('searchStrictC3Btn');
if (searchStrictC3Btn) {
    searchStrictC3Btn.onclick = function() {
        hideUndo();
        searchWithSliderAndRangeLimit(22); 
    };
}

function searchWithSliderAndRangeLimit(maxNoteLimit) {
    var query = document.getElementById('searchInput').value.toLowerCase().trim();
    var resultsDiv = document.getElementById('searchResults');
    var slider = document.getElementById('errorRateSlider');
    var allowedErrorThreshold = slider ? (parseFloat(slider.value) / 100) : 0.1;

    resultsDiv.innerHTML = "Etsitään (max " + (allowedErrorThreshold * 100).toFixed(0) + "% virhettä & max c3)...";
    resultsDiv.style.display = "block";

    setTimeout(function() {
        var candidates = getFilteredLibrary();
        if (query !== "") {
            candidates = candidates.filter(function(f) {
                var abc = f.abc || f.notation || f.content || "";
                var title  = (abc.match(/^T:\s*(.*)/m) || ["", ""])[1].toLowerCase();
                var origin = (abc.match(/^O:\s*(.*)/m) || ["", ""])[1].toLowerCase();
                var source = (abc.match(/^S:\s*(.*)/m) || ["", ""])[1].toLowerCase();
                return title.includes(query) || origin.includes(query) || source.includes(query);
            });
        }

        var filtered = [];
        var semitones = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};
        var resultCounter = 1;

        for (var i = 0; i < candidates.length; i++) {
            var item = candidates[i];
            if (!item) continue;

            var abc = item.abc || item.notation || item.content || "";
            var keyMatch = abc.match(/^K:\s*([A-G][b#]?)\s*([a-zA-Z]*)/m);
            if (!keyMatch) continue;

            var startNote = keyMatch[1];
            var mode = (keyMatch[2] || "").toLowerCase().trim();
            var startVal = semitones[startNote] || 0;
            var targets = getTargetTranspositions(mode);
            var bestScore = { rate: 1.1, oct: 0, trans: 0 };

            targets.forEach(function(targetVal) {
                var transOptions = [targetVal - startVal, (targetVal - startVal) + 12, (targetVal - startVal) - 12];
                transOptions.forEach(function(trans) {
                    [-1, 0, 1].forEach(function(oct) {
                        var rate = countErrorRate(abc, trans, oct);
                        if (rate < bestScore.rate) {
                            if (isNoteRangeOk(abc, trans, oct, maxNoteLimit)) {
                                bestScore = { rate: rate, oct: oct, trans: trans };
                            }
                        }
                    });
                });
            });

            if (bestScore.rate <= allowedErrorThreshold) {
                var titleMatch  = abc.match(/^T:\s*(.*)/m);
                var originMatch = abc.match(/^O:\s*(.*)/m);
                var sourceMatch = abc.match(/^S:\s*(.*)/m);
                
                var originalTitle = titleMatch ? titleMatch[1].trim() : "Nimetön";
                var origin = originMatch ? " (" + originMatch[1].trim() + ")" : "";
                var source = sourceMatch ? " [" + sourceMatch[1].trim() + "]" : "";
                var displayTitle = resultCounter + ". " + originalTitle + origin + source + " (" + (bestScore.rate * 100).toFixed(0) + " %)";
                
                filtered.push({ 
                    item: { name: displayTitle, abc: abc }, 
                    oct: bestScore.oct, 
                    trans: bestScore.trans 
                });
                resultCounter++;
            }
            if (filtered.length >= 200) break;
        }
        renderResults(filtered);
        
        if (filtered.length > 0) {
            var addAllBtn = document.createElement('button');
            addAllBtn.innerHTML = "⭐ Lisää kaikki hakutulokset suosikkeihin";
            addAllBtn.className = "add-all-favorites-btn"; 
            addAllBtn.style = "display: block; width: 100%; margin: 10px 0; padding: 10px; background: #ffc107; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;";
            
            addAllBtn.onclick = function() {
                addAllResultsToFavorites(filtered);
            };
            resultsDiv.insertBefore(addAllBtn, resultsDiv.firstChild);
        }
    }, 50);
}

function isNoteRangeOk(abc, trans, oct, maxNoteLimit) {
    var keyMatch = abc.match(/^K:\s*([A-G][b#]?)\s*([a-zA-Z]*)/m);
    var keyAccidentals = {};
    if (keyMatch) {
        var keyBase = keyMatch[1];
        var mode = keyMatch[2].toLowerCase().trim();
        keyAccidentals = getKeyAccidentals(keyBase, mode);
    }

    var notes = abc.match(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g) || [];
    if (notes.length === 0) return true;

    for (var i = 0; i < notes.length; i++) {
        var n = notes[i];
        var m = n.match(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/);
        var v = getPitchValue(m[2]);

        if (!m[1]) {
            var step = m[2].toUpperCase();
            if (keyAccidentals[step]) v += keyAccidentals[step];
        }

        if (m[1] === '^') v++; 
        if (m[1] === '_') v--;
        
        for (var j = 0; j < m[3].length; j++) { 
            if (m[3][j] === ',') v -= 12; 
            if (m[3][j] === "'") v += 12; 
        }

        var finalStep = v + trans + (oct * 12) - 2;
        if (finalStep > maxNoteLimit) {
            return false;
        }
    }
    return true; 
}

function hasEnoughPlayableNotes(abc) {
    if (!abc) return false;
    var lines = abc.split('\n');
    var musicContent = "";
    
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.includes('|')) {
            musicContent += " " + line;
        }
    }
    musicContent = musicContent.replace(/\[[^\]]*\]/g, '');
    var notes = musicContent.match(/[A-Ga-g]/g) || [];
    return notes.length >= 4;
}

function randomStrictSearch() {
    var library = getFilteredLibrary(); 
    if (!library || library.length === 0) {
        alert("Valitusta lähteestä ei löytynyt kappaleita.");
        return;
    }

    var libraryCopy = [...window.harpLibrary];
    for (let i = libraryCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [libraryCopy[i], libraryCopy[j]] = [libraryCopy[j], libraryCopy[i]];
    }

    var found = false;
    var semitones = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};

    for (var i = 0; i < libraryCopy.length; i++) {
        var item = libraryCopy[i];
        var abc = item.abc || item.notation || item.content || "";

        if (!hasEnoughPlayableNotes(abc)) continue;
        if ((abc.match(/\|/g) || []).length <= 5) continue; 

        var keyMatch = abc.match(/^K:\s*([A-G][b#]?)\s*([a-zA-Z]*)/m);
        if (!keyMatch) continue;

        var startNote = keyMatch[1];
        var mode = (keyMatch[2] || "").toLowerCase().trim();
        var startVal = semitones[startNote] || 0;

        var targets = [];
        if (mode.includes("lyd")) targets = [2];
        else if (mode.includes("mix")) targets = [4];
        else if (mode.includes("dor")) targets = [9, 7];
        else if (mode.includes("min") || mode === "m") targets = [2, 9, 11];
        else targets = [2, 9];

        var bestMatchFoundForThisSong = false;

        for (let targetVal of targets) {
            var transOptions = [targetVal - startVal, (targetVal - startVal) + 12, (targetVal - startVal) - 12];
            for (let trans of transOptions) {
                for (let oct of [-1, 0, 1]) {
                    var rate = countErrorRate(abc, trans, oct);
                    if (rate <= 0.01) {
                        var notes = abc.match(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g) || [];
                        var tooHigh = false;
                        
                        for (let n of notes) {
                            var m = n.match(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/);
                            var v = getPitchValue(m[2]);
                            if (m[1] === '^') v++; if (m[1] === '_') v--;
                            for (var j=0; j<m[3].length; j++) { if (m[3][j] === ',') v-=12; if (m[3][j]==="'") v+=12; }
                            
                            var finalStep = v + trans + (oct * 12) - 2;
                            if (finalStep > 24) {    
                                tooHigh = true;
                                break;
                            }
                        }

                        if (!tooHigh) {
                            document.getElementById('abcInput').value = abc;
                            window.currentTranspose = trans;
                            window.currentOctave = oct;
                            processAbc();
                            found = true;
                            bestMatchFoundForThisSong = true;
                            break;
                        }
                    }
                }
                if (bestMatchFoundForThisSong) break;
            }
            if (bestMatchFoundForThisSong) break;
        }
        if (found) break;
    }

    if (!found) {
        alert("Sopivaa kappaletta ei löytynyt tällä kertaa. Yritä uudelleen.");
    }
}

async function randomStrictSearchLimited() {
    if (!window.harpLibrary || window.harpLibrary.length === 0) {
        alert("Kirjastoa ei ole vielä ladattu.");
        return;
    }

    var slider = document.getElementById('errorRateSlider');
    var allowedErrorThreshold = slider ? (parseFloat(slider.value) / 100) : 0;
    var resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = "Etsitään sopivaa kappaletta...";
    resultsDiv.style.display = "block";

    var library = [...window.harpLibrary];
    for (let i = library.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [library[i], library[j]] = [library[j], library[i]];
    }

    var found = false;
    const semitones = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};
    var maxAttempts = Math.min(library.length, 5000);

    for (var i = 0; i < maxAttempts; i++) {
        var item = library[i];
        var abc = item.abc || item.notation || item.content || "";

        if (!hasEnoughPlayableNotes(abc)) continue;
        if ((abc.match(/\|/g) || []).length <= 5) continue; 

        var keyMatch = abc.match(/^K:\s*([A-G][b#]?)\s*([a-zA-Z]*)/m);
        if (!keyMatch) continue;

        var rawNotes = abc.match(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g) || [];
        if (rawNotes.length === 0) continue;

        var parsedPitches = rawNotes.map(n => {
            var m = n.match(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/);
            var v = getPitchValue(m[2]);
            if (m[1] === '^') v++; if (m[1] === '_') v--;
            for (var j=0; j<m[3].length; j++) { if (m[3][j] === ',') v-=12; if (m[3][j]==="'") v+=12; }
            return v;
        });

        var startNote = keyMatch[1];
        var mode = (keyMatch[2] || "").toLowerCase().trim();
        var startVal = semitones[startNote] || 0;
        var targets = (mode.includes("min") || mode === "m") ? [2, 9, 11] : [2, 9];

        for (let targetVal of targets) {
            var transOptions = [targetVal - startVal, (targetVal - startVal) + 12, (targetVal - startVal) - 12];
            for (let trans of transOptions) {
                for (let oct of [-1, 0, 1]) {
                    let errCount = 0;
                    let tooHigh = false;
                    let shift = trans + (oct * 12) - 2;

                    for (let v of parsedPitches) {
                        let finalStep = v + shift;
                        if (finalStep > 22) { tooHigh = true; break; } 
                        if (allowedD.indexOf(finalStep) === -1) errCount++;
                    }

                    var currentRate = errCount / parsedPitches.length;

                    if (!tooHigh && currentRate <= allowedErrorThreshold) {
                        document.getElementById('abcInput').value = abc;
                        window.currentTranspose = trans;
                        window.currentOctave = oct;
                        processAbc();
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
            if (found) break;
        }
        if (found) break;
    }
    resultsDiv.style.display = "none";
    if (!found) alert("Ei löytynyt matalaa kappaletta näillä ehdoilla.");
}

function countErrorRate(abc, trans, oct) {
    var keyMatch = abc.match(/^K:\s*([A-G][b#]?)\s*([a-zA-Z]*)/m);
    var keyAccidentals = {};

    if (keyMatch){
        var keyBase = keyMatch[1];
        var mode = keyMatch[2].toLowerCase().trim();
        keyAccidentals = getKeyAccidentals(keyBase, mode);
    }
    var notes = abc.match(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g) || [];  
    if (notes.length === 0) return 1;  
      
    var errCount = 0;  
    notes.forEach(n => {  
        var m = n.match(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/);  
        var v = getPitchValue(m[2]);

        if (!m[1]) {
            var step = m[2].toUpperCase();
            if (keyAccidentals[step]) v += keyAccidentals[step];
        }  
        if (m[1] === '^') v++; if (m[1] === '_') v--;  
        for (var j=0; j<m[3].length; j++) { if (m[3][j] === ',') v-=12; if (m[3][j]==="'") v+=12; }  
          
        var s = v + trans + (oct * 12) - 2;  
        if (allowedD.indexOf(s) === -1) errCount++; 
    });  
    return errCount / notes.length;
}

document.getElementById('searchStrictBtn').onclick = async function() {
    hideUndo();
    var query = document.getElementById('searchInput').value.toLowerCase().trim();
    var resultsDiv = document.getElementById('searchResults');
    var candidates = getFilteredLibrary();

    resultsDiv.innerHTML = "Etsitään tiukalla suodatuksella (max 4s)...";
    resultsDiv.style.display = "block";

    var filtered = [];
    var semitones = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};

    var startTime = performance.now();
    var timeLimit = 4000; 

    for (var i = 0; i < candidates.length; i++) {
        if (performance.now() - startTime > timeLimit) break; 

        var item = candidates[i];
        if (!item) continue;

        if (query !== "") {
            var name = (item.name || "").toLowerCase();
            if (name.indexOf(query) === -1) continue;
        }

        var abc = item.abc || item.notation || item.content || "";
        var keyMatch = abc.match(/^K:\s*([A-G][b#]?)\s*([a-zA-Z]*)/m);
        if (!keyMatch) continue;

        var startNote = keyMatch[1];
        var mode = (keyMatch[2] || "").toLowerCase().trim();
        var startVal = semitones[startNote] || 0;

        var targets = [];
        if (mode.includes("lyd")) targets = [2];
        else if (mode.includes("mix")) targets = [4];
        else if (mode.includes("dor")) targets = [9, 7, 4];
        else if (mode.includes("min") || mode === "m") targets = [2, 9, 11];
        else targets = [2, 9];

        var bestScore = { rate: 1.1, oct: 0, trans: 0 };

        targets.forEach(targetVal => {
            var transOptions = [targetVal - startVal, (targetVal - startVal) + 12, (targetVal - startVal) - 12];
            transOptions.forEach(trans => {
                [-1, 0, 1].forEach(oct => {
                    var rate = countErrorRate(abc, trans, oct);
                    if (rate < bestScore.rate) {
                        bestScore = { rate: rate, oct: oct, trans: trans };
                    }
                });
            });
        });

        if (bestScore.rate <= 0.1) {
            filtered.push({ 
                item: item, 
                oct: bestScore.oct, 
                trans: bestScore.trans,
                info: "Sopivuus: " + ((1 - bestScore.rate) * 100).toFixed(0) + "%" 
            });
        }
        if (filtered.length > 50) break;
    }

    renderResults(filtered);
    
    if (performance.now() - startTime > timeLimit) {
        var notice = document.createElement('div');
        notice.style.fontSize = "0.8em";
        notice.style.color = "#666";
        notice.style.padding = "5px";
        notice.innerText = "Näytetään vain ensimmäiset 4 sekunnin aikana löytyneet tulokset.";
        resultsDiv.prepend(notice);
    }
};

function renderResults(res) {  
    resultsDiv.innerHTML = res.length === 0 ? "Ei tuloksia." : "";  
    res.forEach(r => {  
        var d = document.createElement('div');  
        d.className = 'result-item';  
        d.innerHTML = "<strong>" + r.item.name + "</strong>";  
        d.onclick = function() {
            abcInput.value = (r.item.abc || r.item.notation || r.item.content || "")
            .replace(/![^!]*!/g, '')
            .replace(/!/g, '');
            resultsDiv.style.display = "none";
            autoTransposeFromKey(abcInput.value);
            processAbc();
        };
        resultsDiv.appendChild(d);  
    });  
}

function getTransposedAbcText(abcText, semitones) {
    if (!semitones || semitones === 0) return abcText;

    var keys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    var sharps = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    var useSharps = [7, 2, 9, 4, 11, 6, 1, 8]; 
    var basePitch = { 'C':0, 'D':2, 'E':4, 'F':5, 'G':7, 'A':9, 'B':11, 'c':12, 'd':14, 'e':16, 'f':17, 'g':19, 'a':21, 'b':23 };

    var lines = abcText.split('\n');
    var newLines = lines.map(function(line) {
        if (/^(K:\s*)([A-G][b#]?)(.*)/i.test(line)) {
            var match = line.match(/^(K:\s*)([A-G][b#]?)(.*)/i);
            var prefix = match[1];
            var root = match[2].charAt(0).toUpperCase() + match[2].slice(1);
            var suffix = match[3];

            var index = keys.indexOf(root);
            if (index === -1) index = sharps.indexOf(root);
            if (index !== -1) {
                var newIndex = ((index + semitones) % 12 + 12) % 12;
                var newRoot = useSharps.includes(newIndex) ? sharps[newIndex] : keys[newIndex];
                return prefix + newRoot + suffix;
            }
            return line;
        }

        if (/^[A-Z]:/.test(line) && !line.startsWith('K:')) return line;
        if (line.trim().startsWith('w:')) return line;
        if (line.trim().startsWith('%')) return line; 

        return line.replace(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g, function(match, acc, note, octs, dur) {
            if (basePitch[note] === undefined) return match; 

            var v = basePitch[note];
            if (acc === '^') v++;
            if (acc === '_') v--;
            for (var j = 0; j < octs.length; j++) {
                if (octs[j] === ',') v -= 12;
                if (octs[j] === "'") v += 12;
            }

            v += semitones;
            var absPitch = ((v % 12) + 12) % 12;
            var octShift = Math.floor(v / 12);
            var rawName = sharps[absPitch]; 
            var finalAcc = "";
            
            if (rawName.length > 1) { 
                finalAcc = "^";
                rawName = rawName.charAt(0);
            } else if (acc === '_' || acc === '^') {
                finalAcc = "="; 
            }

            if (octShift > 0) {
                rawName = rawName.toLowerCase();
                octShift--; 
            }
            
            var octaveMarks = "";
            if (octShift > 0) {
                octaveMarks = "'".repeat(octShift);
            } else if (octShift < 0) {
                octaveMarks = ",".repeat(Math.abs(octShift));
            }

            return finalAcc + rawName + octaveMarks + dur;
        });
    });

    return newLines.join('\n');
}

function updateAbcDownload(abc) {
    var downloadContainer = document.getElementById('abc-download'); 
    if (!downloadContainer) return;

    var cleanedAbc = abc.replace(/⬤/g, "\u25CF")
                        .replace(/◯/g, "\u25CB")
                        .replace(/◒/g, "\u25D2");

    var transSemitones = window.currentTranspose || 0;
    if (transSemitones !== 0) {
        cleanedAbc = getTransposedAbcText(cleanedAbc, transSemitones);
    }

    var blob = new Blob([cleanedAbc], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var titleMatch = cleanedAbc.match(/^T:\s*(.*)/m);
    var fileName = titleMatch ? titleMatch[1].trim().replace(/[^a-z0-9]/gi, '_') + ".abc" : "nuotit.abc";

    downloadContainer.innerHTML = `
        <a href="${url}" 
           download="${fileName}" 
           style="display:inline-block; padding:10px 20px; background:#3498db; color:white; text-decoration:none; border-radius:5px; font-weight:bold;">
           ⬇️ABC
        </a>`;
}

let exitBtn = document.getElementById('exitFocusMode');
if (!exitBtn) {
    exitBtn = document.createElement('button');
    exitBtn.id = "exitFocusMode";
    exitBtn.innerHTML = "🔙 Lopeta pelkistetty tila";
    document.body.appendChild(exitBtn);
}

const toggleBtn = document.getElementById('toggleFocusMode');
if (toggleBtn) {
    toggleBtn.onclick = function() {
        document.body.classList.add('focus-mode');
        setupFocusLayout(true);
    };
}

exitBtn.onclick = function() {
    document.body.classList.remove('focus-mode');
    setupFocusLayout(false);
};

function setupFocusLayout(enable) {
    const paper = document.getElementById('paper');
    const soitin = document.getElementById('audio');
    const arvontaGroup = document.getElementById('arvonta-group'); 
    const searchBar = document.querySelector('.search-bar');
    const toggleBtn = document.getElementById('toggleFocusMode');
    const editorArea = document.getElementById('editor-area');

    if (enable) {
        document.body.classList.add('focus-mode');
        let container = document.getElementById('focus-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'focus-container';
            paper.parentNode.insertBefore(container, paper);
        }
        if (arvontaGroup) container.appendChild(arvontaGroup);
        if (soitin) container.appendChild(soitin);
    } else {
        document.body.classList.remove('focus-mode');
        if (searchBar && arvontaGroup) {
            searchBar.insertBefore(arvontaGroup, toggleBtn);
        }
        if (editorArea && soitin) {
            editorArea.insertBefore(soitin, editorArea.firstChild);
        }
        const container = document.getElementById('focus-container');
        if (container) container.remove();
    }

    setTimeout(() => {
        if (typeof processAbc === "function") processAbc();
    }, 100);
}

var searchTheSessionBtn = document.getElementById('searchTheSessionBtn');
if (searchTheSessionBtn) {
    searchTheSessionBtn.onclick = async function() {
        var slider = document.getElementById('errorRateSlider');
        var allowedErrorThreshold = slider ? (parseFloat(slider.value) / 100) : 0.1;
    
        hideUndo();
        var query = document.getElementById('searchInput').value.toLowerCase().trim();
        var resultsDiv = document.getElementById('searchResults');
        
        if (query === "") {
            alert("Kirjoita hakusana (esim. polka tai kappaleen nimi) etsiäksesi thesession.org:ista.");
            return;
        }

        resultsDiv.innerHTML = "Haetaan The Session -tietokannasta...";
        resultsDiv.style.display = "block";

        try {
            var searchRes = await fetch("https://thesession.org/tunes/search?q=" + encodeURIComponent(query) + "&format=json");
            var searchData = await searchRes.json();
            
            if (!searchData.tunes || searchData.tunes.length === 0) {
                resultsDiv.innerHTML = "Ei osumia thesession.org:ista tällä hakusanalla.";
                return;
            }

            var topTunes = searchData.tunes.slice(0, 10);
            var filtered = [];
            var semitones = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};

            var typeToMeter = {
                'jig': '6/8', 'slip jig': '9/8', 'reel': '4/4', 'hornpipe': '4/4',
                'polka': '2/4', 'waltz': '3/4', 'slide': '12/8', 'march': '4/4', 'strathspey': '4/4'
            };

            for (var i = 0; i < topTunes.length; i++) {
                resultsDiv.innerHTML = "Ladataan thesession.org osumia (" + (i+1) + "/" + topTunes.length + ")...";
                var tuneId = topTunes[i].id;
                
                var tuneRes = await fetch("https://thesession.org/tunes/" + tuneId + "?format=json");
                var tuneData = await tuneRes.json();

                if (tuneData.settings && tuneData.settings.length > 0) {
                    for (var j = 0; j < tuneData.settings.length; j++) {
                        var setting = tuneData.settings[j];
                        var meter = typeToMeter[tuneData.type] || '4/4';
                        
                        var abc = "X:1\n" +
                                  "T:" + tuneData.name + " (The Session #" + setting.id + ")\n" +
                                  "M:" + meter + "\n" +
                                  "L:1/8\n" +
                                  "K:" + setting.key + "\n" +
                                  setting.abc;

                        var keyMatch = setting.key.match(/^([A-G][b#]?)(.*)/i);
                        if (!keyMatch) continue;

                        var startNote = keyMatch[1];
                        var mode = (keyMatch[2] || "").toLowerCase().trim();
                        var startVal = semitones[startNote] || 0;

                        var targets = getTargetTranspositions(mode);
                        var bestScore = { rate: 1.1, oct: 0, trans: 0 };

                        targets.forEach(function(targetVal) {
                            var transOptions = [targetVal - startVal, (targetVal - startVal) + 12, (targetVal - startVal) - 12];
                            transOptions.forEach(function(trans) {
                                [-1, 0, 1].forEach(function(oct) {
                                    var rate = countErrorRate(abc, trans, oct);
                                    if (rate < bestScore.rate) {
                                        bestScore = { rate: rate, oct: oct, trans: trans };
                                    }
                                });
                            });
                        });

                        if (bestScore.rate <= allowedErrorThreshold) {
                            filtered.push({ 
                                item: { 
                                    name: tuneData.name + " (" + setting.key + ") - Sopivuus: " + ((1 - bestScore.rate) * 100).toFixed(0) + "%", 
                                    abc: abc 
                                }, 
                                oct: bestScore.oct, 
                                trans: bestScore.trans 
                            });
                        }
                    }
                }
            }
            
            if (filtered.length > 0) {
                renderResults(filtered);
                var addAllBtn = document.createElement('button');
                addAllBtn.innerHTML = "⭐ Lisää kaikki hakutulokset suosikkeihin";
                addAllBtn.className = "add-all-favorites-btn";
                addAllBtn.style = "display: block; width: 100%; margin: 10px 0; padding: 10px; background: #ffc107; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;";
                
                addAllBtn.onclick = function() {
                    addAllResultsToFavorites(filtered);
                };
                resultsDiv.insertBefore(addAllBtn, resultsDiv.firstChild);
            } else {
                resultsDiv.innerHTML = "Löydetyt thesession.org tulokset eivät sopineet pitkähuilulle.";
            }

        } catch (err) {
            resultsDiv.innerHTML = "Virhe haettaessa thesession.org:ista: " + err.message;
            console.error("TheSession API error:", err);
        }
    };
}

window.getAudioOptions = function() {
    var instrumentSelect = document.getElementById('instrumentSelect');
    var selectedInstrument = instrumentSelect ? instrumentSelect.value : 'piano';

    if (selectedInstrument === 'flute') {
        return {
            midiTranspose: window.currentTranspose || 0,
            program: 73,                        
            soundFontUrl: "soundfonts/",        
            warpToMidi: true,
            reverb: 0.8                         
        };
    } else {
        return {
            midiTranspose: window.currentTranspose || 0
        };
    }
};

synthControl = new ABCJS.synth.SynthController();

function initAudioController() {
    var currentOptions = window.getAudioOptions();
    synthControl.load("#audio", null, {
        displayLoop: true,
        displayRestart: true,
        displayPlay: true,
        displayProgress: true,
        displayWarp: false,
        options: currentOptions
    });
}

initAudioController();
synth = new ABCJS.synth.CreateSynth();
processAbc();

function lisaaSoitinKuuntelija() {
    var instrumentSelect = document.getElementById('instrumentSelect');
    if (instrumentSelect) {
        instrumentSelect.removeEventListener('change', vaihdaSoitinLennosta);
        instrumentSelect.addEventListener('change', vaihdaSoitinLennosta);
    }
}

function vaihdaSoitinLennosta() {
    if (synth) {
        synth.stop();
    }
    initAudioController();
    processAbc();
}

lisaaSoitinKuuntelija();
document.addEventListener('DOMContentLoaded', lisaaSoitinKuuntelija);
window.addEventListener('load', lisaaSoitinKuuntelija);

var modal = document.getElementById("infoModal");
var btn = document.getElementById("infoBtn");
var span = document.getElementById("closeModal");

btn.onclick = function() {
  modal.style.display = "block";
}

span.onclick = function() {
  modal.style.display = "none";
}

window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(reg => console.log('Service Worker rekisteröity!', reg))
    .catch(err => console.log('Service Worker virhe:', err));
}

};

document.addEventListener('click', function() {
    if (synth && synth.audioContext && synth.audioContext.state === 'suspended') {
        synth.audioContext.resume().then(function() {
            console.log("🔊 Äänimoottori aktivoitu klikkauksella.");
        });
    }
}, { once: true });
