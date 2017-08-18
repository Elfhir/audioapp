// ------------------------ Midi App Javascript ----------
// The name of this App is bad, I should find something better
//
// I use UPPERCASE prefix for function based on their API or context function
// Even though all of them are mixed and strongly bound.
// WA is for Web Audio API
// MIDI is for Web Midi API
// DOM will concern the DOM manipulation
// MEMORY will concern the localforage JS librairy from Mozilla

'use strict';



	// ----------------------------------
	//    Create the global controller.
	// ----------------------------------
	var PianoKGlobal = function() {
		this.MEMORY_setup(localforage.LOCALSTORAGE);
	};


	PianoKGlobal.prototype = {
		// ----------------------------
		//		Init, Config, Setup
		// -----------------------------

		// One function to rule them all,
		// One function to find them
		// One function to bring them all
		// And in the darkness bind them
		// In the land of Mordor where the Shadows lie
		init: function() {
			this.WA_initAudioContext();
			this.isDebug = true;

			// Reserved the allocation of Oscillator references
			this.MIDI_soundsList =  new Array(260);
			this.MIDI_access = {};
			
			this.MIDI_activeInputs = {};
			this.MIDI_activeOutputs = {};
			this.MIDI_activePorts = {};

			this.MIDI_Init();
			this.DOM_mouseListener();

			this.MEMORY_requestLocal("pianoK_oscillator_type");
			this.MEMORY_requestLocal("pianoK_detune_value");

		},

		// Function to animate the DOM
		DOM_init: function() {
			var self = this;
			$("body").removeClass("loading");

			console.info(self);
			// $(".input.detune").val(self.pianoK_detune_value);
		},

		// Set the Driver local memory
		// It will keep through time our settings,
		// Songs recorded or other things.
		// 
		// Driver choice
		// INDEXEDDB:"asyncStorage"
		// LOCALSTORAGE:"localStorageWrapper"
		// WEBSQL:"webSQLStorage"
		//
		MEMORY_setup: function(driver) {
			var self = this;
			localforage.setDriver(driver);

			switch(driver) {

				// using indexedDB
				case "asyncStorage":

				localforage.getItem('pianoK_settings', function(error, value) {
					if(self.isDebug && error !== null) {console.warn(error);}

						// singleton
						if (null !== value) {
							if(self.isDebug) {console.info("return previous store");}

							self.MEMORY_settings = localforage;
							self.init();
						}
						else {
							if(self.isDebug) {console.info("create and return new instance");}

							localforage.setItem("pianoK_settings", "settings");
							localforage.setItem("pianoK_version", + new Date());
							localforage.setItem("pianoK_oscillator_type", "square");
							localforage.setItem("pianoK_detune_value", 100);

							self.MEMORY_settings = localforage;
							self.init();
						}
					});

				break;

				default:
				// using localStorage
				case "localStorageWrapper":

				localforage.getItem('pianoK_settings', function(error, value) {
					if(self.isDebug && error !== null) {console.warn(error);}

						// singleton
						if (null !== value) {
							if(self.isDebug) {console.info("return previous store");}

							self.MEMORY_settings = localforage;
							self.init();
						}
						else {
							if(self.isDebug) {console.info("create and return new instance");}

							localforage.setItem("pianoK_settings", "settings");
							localforage.setItem("pianoK_version", + new Date());
							localforage.setItem("pianoK_oscillator_type", "sawtooth");
							localforage.setItem("pianoK_detune_value", 100);

							self.MEMORY_settings = localforage;
							self.init();
						}
					});


				break;

				case "webSQLStorage":
				console.warn("webSQLStorage is not yet implemented !");
				break;

			}
		},

		// Init AudioContext of the WebAudio API
		// 
		//
		WA_initAudioContext: function() {

			// Check if we are using Web Audio and setup the AudioContext if we are.
			try {
				if (typeof AudioContext !== 'undefined') {
					this.WA_ctx = new AudioContext();
				} else if (typeof webkitAudioContext !== 'undefined') {
					this.WA_ctx = new webkitAudioContext();
				} else {
					this.usingWebAudio = false;
				}
			} catch(e) {
				
				this.usingWebAudio = false;
			}

			// Check if a webview is being used on iOS8 or earlier (rather than the browser).
			// If it is, disable Web Audio as it causes crashing.
			var iOS = (/iP(hone|od|ad)/.test(this._navigator && this._navigator.platform));
			var appVersion = this._navigator && this._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/);
			var version = appVersion ? parseInt(appVersion[1], 10) : null;
			if (iOS && version && version < 9) {
				var safari = /safari/.test(this._navigator && this._navigator.userAgent.toLowerCase());
				if (this._navigator && this._navigator.standalone && !safari || this._navigator && !this._navigator.standalone && !safari) {
					this.usingWebAudio = false;
				}
			}

		},


		// ----------------------------
		//			MIDI
		// -----------------------------

		// MIDI main routine
		// Browser will request acces to any MIDI devices available.
		//
		MIDI_Init: function() {
			var self = this;
			navigator.requestMIDIAccess().then( self.MIDI_onsuccesscallback, self.MIDI_onerrorcallback );
		},

		// MIDI basic message handler
		// Create a sounds or stop it
		//
		MIDI_MessageHandler: function(midimessageEvent){
			var port, portId,
			data = midimessageEvent.data,
			midi_type = data[0],
			key = data[1],  // key id
			velocity = data[2]; // velocity ?
			var validKey = true;

			//console.log(data);

			if (velocity != 127) {
				if (typeof self.PianoK.MIDI_soundsList[key] === "undefined") {
					// last param is true because it's MIDI
					self.PianoK.MIDI_soundsList[key] = self.PianoK.WA_generateOscillatorSound(self.PianoK.pianoK_oscillator_type, key, false, self.PianoK.pianoK_detune_value );

					if (self.PianoK.MIDI_soundsList[key] != undefined) {
						self.PianoK.MIDI_soundsList[key].connect(self.PianoK.WA_ctx.destination);
						self.PianoK.MIDI_soundsList[key].start();
					}
				}

			}
			else if (velocity == 127) {
				(self.PianoK.MIDI_soundsList[key] != undefined) ? self.PianoK.MIDI_soundsList[key].stop() : validKey = false;

				//console.warn(self.PianoK.soundsList[key]);

				if (self.PianoK.MIDI_soundsList[key] != undefined) {
					delete self.PianoK.MIDI_soundsList[key];
				}
			}

		},


		// MIDI main routine
		// For now with one MIDI input,
		// setup the default Message Handler
		//
		MIDI_main: function() {
			var input = self.PianoK.MIDI_access.inputs.values().next();
			input.value.onmidimessage = self.PianoK.MIDI_MessageHandler;
			$(".mk-manufacturer").html(input.value.manufacturer);
			$(".mk-name").html(input.value.name);
			$(".mk-connection").html(input.value.connection);
			$(".mk-state").html(input.value.state);
		},

		MIDI_onsuccesscallback: function(midiAccess) {

			self.PianoK.MIDI_access = midiAccess;

			self.PianoK.MIDI_main();

			// update the device list when devices get connected, disconnected, opened or closed
			self.PianoK.MIDI_access.addEventListener("statechange", function(e) {
				
				var port = e.port;
				
				var listener = port.type === 'input' ? self.PianoK.MIDI_in_onchange : self.PianoK.MIDI_out_onchange;
				self.PianoK.MIDI_activePorts = port.type === 'input' ? self.PianoK.MIDI_activeInputs : self.PianoK.MIDI_activeOutputs;

				$(".mk-manufacturer").html(port.manufacturer);
				$(".mk-name").html(port.name);
				$(".mk-connection").html(port.connection);
				$(".mk-state").html(port.state);

				if(port.state === "disconnected") {
					$(".mk-connection").addClass("disconnected");
					port.close();
				}
				else if (port.state === "connected") {
					$(".mk-connection").addClass("connected");
				}
				else {
					console.warn("dunno");
				}
			}, false);

		},

		MIDI_onerrorcallback: function(err) {
			console.error( "uh-oh! Something went wrong! Error code: " + err.code );
		},

		// Request Local variable in localforage
		// And set it to the global PianoK object
		// Immediatly available instead of the Promise way
		//
		MEMORY_requestLocal: function(key) {
			var self = this;
			localforage.getItem(key, function(error, value) {
				if(self.isDebug && error !== null) {console.warn(error);}
				if (key !== "") {
					if (null !== value) {
						self[key] = value;
					}
					else {
						self[key] = "_empty_";
					}			
				}
			});
		},

		MEMORY_trash: function(full_clear) {
			if (full_clear) {
				localforage.clear().then(function() {
					console.log('Database is now empty.');
				}).catch(function(err) {
					console.log(err);
				});
			}
			else {

			}
		},

		// ----------------------------
		//		Event Handlers
		// -----------------------------
		DOM_mouseListener: function() {
			var self = this;

			$('body').on("click", ".siteHeaderButton", function(e) {
				if ($(this).data("type")) {
					self.MEMORY_settings.setItem("pianoK_oscillator_type", $(this).data("type"));
					self.MEMORY_requestLocal("pianoK_oscillator_type");
				}
				else if ($(this).hasClass("refresh")) {
					location.reload();
				}
				else if ($(this).hasClass("trash")) {
					console.log("Trash localforage");
					self.MEMORY_trash(true);
				}
			});
		},

		DOM_defaultPlay: function(key) {
			$("[data-keyboard~="+key+"]").addClass("active");
		},

		DOM_defaultState: function(key) {
			$("[data-keyboard~="+key+"]").removeClass("active");
		},

		// Web Audio API generation of an Oscillator
		// Params :
		// waveform_type : square, sine, sawtooth, triangle, custom
		// key : the key number from a MIDI keyboard
		// frequency : if provided, generate a sound with this frequency (Hz)
		WA_generateOscillatorSound: function(waveform_type, key, frequency, detune) {
			// create Oscillator node
			var oscillator = this.WA_ctx.createOscillator();
			

			// 12-root of 2 == 12√2 == 2^(1/12)
			// https://fr.wikipedia.org/wiki/Gamme_tempérée
			var r = 1.0594630943592953;

			var exp = (Math.abs(57 - parseFloat(key)));
			var frequency = frequency;

			if (frequency === undefined || frequency === false) {

				if (key == 57) {
					frequency = 440;
				}
				else if (key < 57) {
					frequency = 440.0 / Math.pow(r, exp);
				}
				else if (key > 57) {
					frequency = 440.0 * Math.pow(r, exp);
				}
			}

			oscillator.type = waveform_type;
			oscillator.detune.value = detune;
			oscillator.frequency.value = frequency;
			// oscillator.connect(this.WA_ctx.destination);
			return oscillator;
		},

		debug: function() {
			var self = this;
			self.isDebug = true;
			console.group("PianoK Debug");
			console.dir(this);
			console.groupEnd();
		},
	}

	// Setup the global audio controller.
	var PianoK = new PianoKGlobal();

	PianoK.debug();
	PianoK.DOM_init();