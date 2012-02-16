///////////////////////////////////////////////////////////////////////////////
//
//  ExtendedPlayer
//
//  This extends the base player class, you may override the base player
//  member functions or add additional player functionality here. 
//
///////////////////////////////////////////////////////////////////////////////
Type.registerNamespace('ExtendedPlayer');

ExtendedPlayer.Player = function(domElement) {
	ExtendedPlayer.Player.initializeBase(this, [domElement]);  
}
ExtendedPlayer.Player.prototype =  {
	onPluginLoaded: function(args) {    
		ExtendedPlayer.Player.callBaseMethod(this, 'onPluginLoaded', [args]);            
	},

	pluginDispose: function() {
		ExtendedPlayer.Player.callBaseMethod(this, 'pluginDispose');
	}
}
ExtendedPlayer.Player.registerClass('ExtendedPlayer.Player', ExpressionPlayer.Player);

