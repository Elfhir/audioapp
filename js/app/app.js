

'use strict';

/** Global Methods **/
/***************************************************************************/

	/**
	* Create the global controller.
	*/
	var PianoKGlobal = function() {
		this._setup(localforage.LOCALSTORAGE);
	};


	PianoKGlobal.prototype = {
		init: function() {
			this.initAudioContext();
			
			this.keylistener();
			this.soundsList =  new Array(260);
			this.MIDIsoundsList =  new Array(260);
			this.isDebug = true;
			this.mouseListener();
			this.m = {}; // m = MIDIAccess object
			this.activeInputs = {};
			this.activeOutputs = {};
			this.activePorts = {};
			this.MIDI_Init();

			this._create("pianoK_default_oscillator_type");
			this._create("pianoK_detune_value");

		},

		domInit: function() {
			var self = this;
			$("body").removeClass("loading");

			$(".stepperInput__input").val(self.pianoK_detune_value);
		},

		MIDI_Init: function() {
			var self = this;
			navigator.requestMIDIAccess().then( self.onsuccesscallback, self.onerrorcallback );
		},

		MIDI_MessageHandler: function(midimessageEvent){
			var port, portId,
			data = midimessageEvent.data,
			midi_type = data[0],
			key = data[1],  // key id
			velocity = data[2]; // velocity ?
			var validKey = true;

			console.log(data);

			if (velocity != 127) {
				if (typeof self.PianoK.MIDIsoundsList[key] === "undefined") {
					// last param is true because it's MIDI
					self.PianoK.MIDIsoundsList[key] = self.PianoK.generateOscillatorSound(self.PianoK.pianoK_default_oscillator_type, key, true);

					(self.PianoK.MIDIsoundsList[key] != undefined) ? self.PianoK.MIDIsoundsList[key].start() : validKey = false;
				}

			}
			else if (velocity == 127) {
				(self.PianoK.MIDIsoundsList[key] != undefined) ? self.PianoK.MIDIsoundsList[key].stop() : validKey = false;

				//console.warn(self.PianoK.soundsList[key]);

				if (self.PianoK.MIDIsoundsList[key] != undefined) {
					delete self.PianoK.MIDIsoundsList[key];
				}
			}

		},

		MIDI_in_onchange: function() {
			console.log(this);
			var port = self.PianoK.activePorts;
			console.info(port);
			port.addEventListener("midimessage", self.PianoK.MIDI_MessageHandler, false);
			port.addEventListener("statechange", function(e) {
				console.info(e);
				console.info(port.name + ' (' + port.state + ', ' +  port.connection + ')')
			}, false);
			port.open();
		},

		MIDI_out_onchange: function() {
			var port = self.PianoK.activePorts;
			console.info(port);
			port.addEventListener("midimessage", self.PianoK.MIDI_MessageHandler, false);
			port.addEventListener("statechange", function(e) {
				console.info(e);
				console.info(port.name + ' (' + port.state + ', ' +  port.connection + ')')
			}, false);
			port.open();
		},

		MIDI_main: function() {
			var input = self.PianoK.m.inputs.values().next();
			input.value.onmidimessage = self.PianoK.MIDI_MessageHandler;
		},

		onsuccesscallback: function(midiAccess) {

			self.PianoK.m = midiAccess;

			self.PianoK.MIDI_main();

			// update the device list when devices get connected, disconnected, opened or closed
			self.PianoK.m.addEventListener("statechange", function(e) {
				
				var port = e.port;
				
				var listener = port.type === 'input' ? self.PianoK.MIDI_in_onchange : self.PianoK.MIDI_out_onchange;
				self.PianoK.activePorts = port.type === 'input' ? self.PianoK.activeInputs : self.PianoK.activeOutputs;

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

		onerrorcallback: function(err) {
			console.error( "uh-oh! Something went wrong! Error code: " + err.code );
		},

		/*
		* Driver choice
		* INDEXEDDB:"asyncStorage"
		* LOCALSTORAGE:"localStorageWrapper"
		* WEBSQL:"webSQLStorage"
		*/
		_setup: function(driver) {
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

							self.settings = localforage;
							self.init();
						}
						else {
							if(self.isDebug) {console.info("create and return new instance");}

							localforage.setItem("pianoK_settings", "settings");
							localforage.setItem("pianoK_version", + new Date());
							localforage.setItem("pianoK_default_oscillator_type", "square");
							localforage.setItem("pianoK_detune_value", 100);

							self.settings = localforage;
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

							self.settings = localforage;
							self.init();
						}
						else {
							if(self.isDebug) {console.info("create and return new instance");}

							localforage.setItem("pianoK_settings", "settings");
							localforage.setItem("pianoK_version", + new Date());
							localforage.setItem("pianoK_default_oscillator_type", "square");
							localforage.setItem("pianoK_detune_value", 100);

							self.settings = localforage;
							self.init();
						}
					});


				break;

				case "webSQLStorage":

				break;

			}
		},


		_create: function(key) {
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

	/*
	* Debug
	*/
	_debug: function() {
		var self = this;
		self.isDebug = true;
		console.group("PianoK Debug");
		console.dir(this);
		console.groupEnd();
	},

	_trash: function(full_clear) {
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

		/* Default is azerty french keyboard
		*  later will be provide a region keyboard option
		*/
		keylistener: function() {
			var self = this;
			var validKey = true;

			$(document).on("keydown.PianoK", function(event) {
				validKey = true;
				//if(self.isDebug) {console.log(event.which);}

				var type = self.settings.getItem("pianoK_default_oscillator_type", function(error, value) {
					if(self.isDebug && error !== null) {console.warn(error);}

					

					if (typeof self.soundsList[event.which] === "undefined"){

						self.soundsList[event.which] = self.generateOscillatorSound(value, event.which);

						(self.soundsList[event.which] != undefined) ? self.soundsList[event.which].start() : validKey = false;

						if (validKey === true) {
							self.defaultPlay(event.which);
							event.preventDefault();
						}
						else {

							self.pause(event);
						}
					}
				});

			});


			$(document).on("keyup.PianoK", function(e) {

				//if(self.isDebug) {console.log(e.which);}

				(self.soundsList[e.which] != undefined) ? self.soundsList[e.which].stop() : validKey = false;

				//console.warn(self.soundsList[e.which]);

				if (self.soundsList[e.which] != undefined) {
					delete self.soundsList[e.which];
				}
				else {
					console.warn(e.which);
				}

				if (validKey === true) {
					self.defaultState(e.which);
					e.preventDefault();
				}

			});

		},

		mouseListener: function() {
			var self = this;
			
			$('body').on("click", ".siteHeaderButton", function(e) {
				if ($(this).data("type")) {
					self.settings.setItem("pianoK_default_oscillator_type", $(this).data("type"));
				}
				else if ($(this).hasClass("refresh")) {
					location.reload();
				}
				else if ($(this).hasClass("trash")) {
					console.log("Trash localforage");
					self._trash(true);
				}
			});

			$('body').on("click", ".button--addOnLeft", function(e) {
				if (self.pianoK_detune_value > 0) {
					self.pianoK_detune_value--;
					console.log(self.pianoK_detune_value);

					localforage.setItem("pianoK_detune_value", self.pianoK_detune_value);
				}
			});

			$('body').on("click", ".button--addOnRight", function(e) {
				if (self.pianoK_detune_value < 100) {
					self.pianoK_detune_value++;
					console.log(self.pianoK_detune_value);
					localforage.setItem("pianoK_detune_value", self.pianoK_detune_value);
				}
			});

			$('body').on("mousedown", ".key", function(e) {
				var key = $(this).data("keyboard");
				var validKey = true;

				var type = self.settings.getItem("pianoK_default_oscillator_type", function(error, value) {
					if(self.isDebug && error !== null) {console.warn(error);}

					if (typeof self.soundsList[key] === "undefined"){

						self.soundsList[key] = self.generateOscillatorSound(value, key);

						(self.soundsList[key] != undefined) ? self.soundsList[key].start() : validKey = false;

						if (validKey === true) {
							self.defaultPlay(key);
							event.preventDefault();
						}
						else {
							self.pause(event);
						}
					}
				});


				
			});

			$('body').on("mouseup", ".key", function(e) {
				//if(self.isDebug) {console.log(e.which);}

				var key = $(this).data("keyboard");
				var validKey = true;

				(self.soundsList[key] != undefined) ? self.soundsList[key].stop() : validKey = false;

				if (self.soundsList[key] != undefined) {
					delete self.soundsList[key];
				}
				else {
					console.warn(key);
				}

				if (validKey === true) {
					self.defaultState(key);
					e.preventDefault();
				}
			});
		},

		defaultPlay: function(key) {
			$("[data-keyboard~="+key+"]").addClass("active");
		},

		defaultState: function(key) {
			$("[data-keyboard~="+key+"]").removeClass("active");
		},

		pause: function(keydownEvent) {
			var self = this;
			switch(keydownEvent.which) {

				// Pause Attn
				case 19:
				for( var i = 0, l = self.soundsList.length; i < l ; ++i) {
					if (self.soundsList[i] !== undefined) {
						self.soundsList[i].stop();
						self.soundsList[i].disconnect();
						if(self.isDebug) {console.log(self.soundsList[i]);}
					}
				}
				break;

				default:
				break;
			}
		},




		initAudioContext: function() {

			// Check if we are using Web Audio and setup the AudioContext if we are.
			try {
				if (typeof AudioContext !== 'undefined') {
					this.ctx = new AudioContext();
				} else if (typeof webkitAudioContext !== 'undefined') {
					this.ctx = new webkitAudioContext();
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

		generateOscillatorSound: function(type, key, isMIDI_keyboard) {
			// create Oscillator node
			var oscillator = this.ctx.createOscillator();
			oscillator.connect(this.ctx.destination);
			if (isMIDI_keyboard === undefined || isMIDI_keyboard === false) {

				var frequency = 0;
				// Hz

				switch(key) {

					/* azertyuiop */
					case 65: // a
					frequency = 440.00;
					break;

					case 90: // z
					frequency = 493.88;
					break;

					case 69: // e
					frequency = 523.25;
					break;

					case 82: // r
					frequency = 587.33;
					break;

					case 84: // t
					frequency = 659.26;
					break;

					case 89: // y
					frequency = 698.46;
					break;

					case 85: // u
					frequency = 783.89;
					break;

					case 73: // i
					frequency = 880.00;
					break;

					case 79: // o
					frequency = 987.77;
					break;

					case 80: // p
					frequency = 1046.50;
					break;


					/* é'(è_ç  or 2 45 789 */
					case 50: // é
					frequency = 466.16;
					break;

					case 52: // '
					keydownEvent.preventDefault();
					frequency = 554.37;
					break;

					case 53: // (
					frequency = 622.25;
					break;

					case 55: // è
					frequency = 739.99;
					break;

					case 56: // _
					frequency = 830.61;
					break;

					case 57: // ç
					frequency = 932.33;
					break;


					/* wxcvbn,;:! */
					case 87: // w
					frequency = 1174.66;
					break;

					case 88: // x
					frequency = 1318.51;
					break;

					case 67: // c
					frequency = 1396.91;
					break;

					case 86: // v
					frequency = 1567.98;
					break;

					case 66: // b
					frequency = 1760.00;
					break;

					case 78: // n
					frequency = 1975.53;
					break;

					case 188: // ,
					frequency = 2093.00;
					break;

					case 59: // ;
					frequency = 2349.32;
					break;

					case 58: // :
					frequency = 2637.02;
					break;

					case 161: // !
					frequency = 2793.83;
					break;

					/* °q */
					case 169:
					case 81:
					frequency = 1108.73;
					break;


					/* sfghkl */
					case 83: // s
					frequency = 1244.51;
					break;

					case 70: // f
					frequency = 1479.98;
					break;

					case 71: // g
					frequency = 1661.22;
					break;

					case 72: // h
					frequency = 1864.66;
					break;

					case 75: // k
					frequency = 2217.46;
					break;

					case 76: // l
					frequency = 2489.02;
					break;

					case 165: // %
					frequency = 2959.96;
					break;


					default: 
					break; // exit this handler for other keys
				}
		}
		else {


			// 12-root of 2 == 12√2 == 2^(1/12)
			var r = 1.0594630943592953;
			if (key == 57) {
				frequency = 440;
			}
			else if (key < 57) {
				frequency = 440.0 / (Math.abs(57 - parseFloat(key)));
			}
			else if (key > 57) {
				frequency = 440.0 * (Math.abs(57 - parseFloat(key)));
			}
		}
		oscillator.type = type;
		/*oscillator.detune = detune;*/
		oscillator.frequency.value = frequency; 
		return oscillator;
	},


}

	// Setup the global audio controller.
	var PianoK = new PianoKGlobal();

	PianoK._debug();
	PianoK.domInit();