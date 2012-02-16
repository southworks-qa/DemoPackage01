// ExpressionPlayer extends the Sys.UI.SilverlightMedia player class, adding URL parsing and mediainfo support
//

Type.registerNamespace('ExpressionPlayer');

//
// optional URL parameters
//
ExpressionPlayer.UrlParam = {
	startTime   :   "startTime",    // specify start time for presentation on url in seconds as ...&start=5&...
	chapter     :   "chapter",      // start presentation at chapter # passed on url...&chapter=2&...
	loopCount   :   "loopCount",    // specify # of times to loop presentation on url as ...&loop=5&...  (-1 means forever)
	mediaSource :   "mediaSource",  // overrides the video source passed into the script, plays this video instead
	volume      :   "volume",       // overrides starting volume
	muted       :   "muted",        // mute=true mutes volume at start
	duration    :   "duration",     // amount of time to play
	autoplay    :   "autoplay",     // auto start playing presentation (default = 1 - yes)
	autoload    :   "autoload",     // cue up media on load.
	mediainfo   :   "mediainfo",    // media info, URL to JScript file with function 'mediainfo' which returns a JSON array (see docs)
	fakeoutput  :   "fakeoutput"    // used only internally, causes script to use stock output for content.
};


ExpressionPlayer.Player = function(domElement) {
	ExpressionPlayer.Player.initializeBase(this, [domElement]);    
}
ExpressionPlayer.Player.prototype =  {
	_fInitialized: false,
	_fakeOutput: "",
	_startButton: null,

	initialize: function() {
		ExpressionPlayer.Player.callBaseMethod(this, 'initialize');

		var content = this.get_element().content;       
		 
		// listen to URL parameters
		this.set_autoPlay( $getArgument(ExpressionPlayer.UrlParam.autoplay, this.get_autoPlay().toString()) === "true" );
		this.set_autoLoad( $getArgument(ExpressionPlayer.UrlParam.autoload, this.get_autoLoad().toString()) === "true" );
		this.set_mediaSource( $getArgument(ExpressionPlayer.UrlParam.mediaSource, this.get_mediaSource() ) );
		this.set_mediainfo( $getArgument(ExpressionPlayer.UrlParam.mediainfo, this.get_mediainfo()) );
		this.set_muted( $getArgument(ExpressionPlayer.UrlParam.muted, this.get_muted().toString() ) === "true" );
		this.set_volume( parseFloat($getArgument(ExpressionPlayer.UrlParam.volume, this.get_volume() )) );
		this.set_fakeOutput( $getArgument(ExpressionPlayer.UrlParam.fakeoutput, this.get_fakeOutput()) );
		var chapterArg = $getArgument(ExpressionPlayer.UrlParam.chapter);
		if (chapterArg!=="") {
			this.set_currentChapter(parseInt(chapterArg));
		}

		if (this.get_mediainfo()!=="") {        
			this._initMediainfo();
		}

		this._fInitialized=true;
	},
	
	_meOpened: function() {
		ExpressionPlayer.Player.callBaseMethod(this, '_meOpened');
		this.set_position( parseFloat($getArgument(ExpressionPlayer.UrlParam.startTime, this.get_position())) );
	},

	set_galleryInfo : function ( galleryItems, callbackDelegate ) {
		if (this._gallery == null) {
			var galleryElement = this.get_element().content.findName( "GalleryArea" );        
			if (galleryElement!=null) {
				var galleryToggleButton = this.get_element().content.findName( "GalleryToggleButton" );
				this._gallery = new Sys.UI.Silverlight._ImageList( galleryElement, galleryToggleButton, false, callbackDelegate, this);
			}
		}        
		if (this._gallery != null) {
			this._gallery.set_items( galleryItems );
		}
	},

	get_mediainfo: function () {
		return this._mediainfo;
	},
	
	set_mediainfo: function(mediainfo) {
		this._mediainfo = mediainfo;
		if (this._fInitialized) {
			this._initMediainfo();
		}
	}, 

	_initMediainfo: function() {
		// Load mediainfo from a mediainfo JSON array or a function that returns
		if (typeof(this._mediainfo)==="function") {
			this.set_chapters( this._mediainfo().chapters );
			this.set_placeholderSource( this._mediainfo().placeholderSource );
			this.set_mediaSource( this._mediainfo().mediaSource );
		}
		else if (this._mediainfo.mediaSource!=null) {
			this.set_chapters( this._mediainfo.chapters );
			this.set_placeholderSource( this._mediainfo.placeholderSource );
			this.set_mediaSource( this._mediainfo.mediaSource );
		}
		else {
			throw Error.invalidOperation("unknown type for mediainfo");
		}
	},   
	
	set_fakeOutput: function(value) {
		if ("".length>0) {
			this._fakeOutput=unescape(value);
			if (this._fakeOutput!="") {
				this.set_mediainfo(
					{ "mediaSource": this._fakeOutput+"/sl.wmv",
					  "placeholderSource": this._fakeOutput+"/sl1.jpg",
					  "chapters": [ new Sys.UI.Silverlight.MediaChapter("", 1,this._fakeOutput+"/sl1.jpg") , 
									new Sys.UI.Silverlight.MediaChapter("", 2,this._fakeOutput+"/sl2.jpg") , 
									new Sys.UI.Silverlight.MediaChapter("", 4,this._fakeOutput+"/sl3.jpg")  ] } 
					);
			}
		}
	},
	
	get_fakeOutput: function() {
		return this._fakeOutput;
	},

	set_timeIndex: function(value) {
		// check for skipping past end of file and raise media ended
		if(this._mediaElement && this._canSeek && value>this._naturalduration ) {
			this._raiseEvent("mediaEnded", Sys.EventArgs.Empty);
		}
		else {
			ExpressionPlayer.Player.callBaseMethod(this, 'set_position', [value]);
		}
	},
	
	
	
	add_playPreviousVideo:function(handler) { 
		this.get_events().addHandler("playPreviousVideo", handler);
	},
	
	remove_playPreviousVideo:function(handler) {
		this.get_events().removeHandler("playPreviousVideo", handler);
	},
			
	_onPrevious:function() {
		var chapters = this.get_chapters();
		var tmWindowMin = 2;
		if (chapters!=null && chapters.length>0)
			tmWindowMin = Math.min(tmWindowMin, chapters[0].get_position());
		if (this.get_position() < tmWindowMin) {
				this._raiseEvent("playPreviousVideo");         
				return;
			}
		ExpressionPlayer.Player.callBaseMethod(this, '_onPrevious');        
	},
	
	add_playNextVideo:function(handler) { 
		this.get_events().addHandler("playNextVideo", handler);
	},
	
	remove_playNextVideo:function(handler) {
		this.get_events().removeHandler("playNextVideo", handler);
	},                           
						   
	_onNext:function() {
		var chapters = this.get_chapters();
		if (!chapters || !chapters.length) {        
			var delta = Math.max(5, this._duration / 10);
			var newTime = delta + this.get_position();
			if (newTime > this._duration) {
				this._raiseEvent("playNextVideo");         
				return;
			}
		}
		else {
			var chapterLast = chapters[chapters.length-1];
			if (chapterLast.get_position()<this.get_position()) {                
				this._raiseEvent("playNextVideo");
				return;
			}              
		}  
		ExpressionPlayer.Player.callBaseMethod(this, '_onNext');     
	}
}

ExpressionPlayer.Player._playerCount = 0;
ExpressionPlayer.Player._getUniqueName = function(baseName) {
	return baseName + ExpressionPlayer.Player._playerCount++;
}
ExpressionPlayer.Player.registerClass('ExpressionPlayer.Player',  Sys.UI.Silverlight.MediaPlayer);



ExpressionPlayer.GalleryItem = function (title, thumbnailSource) {
	this._title = title;
	this._thumbnailSource = thumbnailSource;
	ExpressionPlayer.GalleryItem.initializeBase(this);
}
ExpressionPlayer.GalleryItem.prototype = {
	get_thumbnailSource : function() {
		return this._thumbnailSource;
	},
	get_title : function () {
		return this._title;
	}
}
ExpressionPlayer.GalleryItem.registerClass("ExpressionPlayer.GalleryItem");



ExpressionPlayer.ShowHideAnimationButton = function(player, controlName, nameElement, showing) {
	var domElement = player.get_element().content.findName( controlName );   
	ExpressionPlayer.ShowHideAnimationButton.initializeBase(this, [domElement, true, null, this._onToggle, null, this]);   
	this._animOpen = nameElement ? player.get_element().content.findName(nameElement + "_Show") : null;
	this._animClose = nameElement ? player.get_element().content.findName(nameElement + "_Hide") : null;    
	this._showing = !!showing;
}
ExpressionPlayer.ShowHideAnimationButton.prototype= {
   _onToggle: function () {
		this._showing = !this._showing;
		if (this._showing && this._animOpen) {
			this._animOpen.begin();
		}
		if (!this._showing && this._animClose) {
			this._animClose.begin();	        
		}
	},

   dispose: function() {
		this._animOpen = null;
		this._animClose = null;  
		ExpressionPlayer.ShowHideAnimationButton.callBaseMethod(this, "dispose");      	        
   }
}
ExpressionPlayer.ShowHideAnimationButton.registerClass('ExpressionPlayer.ShowHideAnimationButton', Sys.UI.Silverlight._Button);


ExpressionPlayer.HotspotButton = function (player, controlName) {
	var domElement = player.get_element().content.findName( controlName );   
	ExpressionPlayer.HotspotButton.initializeBase(this, [domElement, true, null, null, null, this]);      
	this.timeoutId = 0;
	this._showAnim = player.get_element().content.findName(controlName+"_MouseEnter");
	this._hideAnim = player.get_element().content.findName(controlName+"_MouseLeave");
}
ExpressionPlayer.HotspotButton.prototype = {
	_onEnter : function () {	
		this._showHideControls ( true );
	},
	
	_onLeave : function () {	
		 this._showHideControls ( false );
	},
	
	_showHideControls : function (fShow) {    
		if (this._timeoutId!=0) {
			window.clearTimeout( this._timeoutId );
			this._timeoutId = 0;
		}
		
		if (!fShow) {
			this._timeoutId = window.setTimeout(Function.createDelegate(this, this._hideControls), 1000);     
		} else {
			this._showControls();
		}
	},

	_hideControls : function () {
		if (this._controlsShowing) {
			this._hideAnim.begin();	
		}	   
		this._controlsShowing = false;
	},

	_showControls : function() {
		if (!this._controlsShowing)	{
			this._showAnim.begin();		  
		}
		this._controlsShowing = true;
	}    
}
ExpressionPlayer.HotspotButton.registerClass('ExpressionPlayer.HotspotButton', Sys.UI.Silverlight._Button);



function $getArgument(strArg, defVal) {
   var urlArgs=window.location.search.substring(1);
   var vals = urlArgs.split("&");
   var strArgLower = strArg.toLowerCase();
   for (var i=0;i<vals.length;i++) {
		var nvPair = vals[i].split("=");
		if (nvPair[0].toLowerCase() === strArgLower) {
			return unescape(nvPair[1]);
		}
   }
   if (typeof(defVal)!=='undefined') {
		return defVal;
   }
   return "";
}


