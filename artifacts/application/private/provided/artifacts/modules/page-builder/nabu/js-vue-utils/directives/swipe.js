Vue.directive("swipe", {
	bind: function(element, binding) {
		element.$$touchStart = function(event) {
			element.$$touches = event.touches[0];
		}
		var keys = Object.keys(binding.modifiers);
		var variance = 50;
		for (var i = 0; i < keys.length; i++) {
			if (parseInt(keys[i]) == keys[i]) {
				variance = parseInt(keys[i]);
				keys.splice(i, 1);
				break;
			}
		}
		element.$$touchMove = function(event) {
			if (element.$$touches) {
				var fromX = element.$$touches.clientX;
				var fromY = element.$$touches.clientY;
				
				var toX = event.touches[0].clientX;
				var toY = event.touches[0].clientY;
				
				var diffX = toX - fromX;
				var diffY = toY - fromY;
				
				var trigger = false;
				// we prioritize left/right over up/down
				if (Math.abs(diffX) > Math.abs(diffY)) {
					// swipe right
					if (diffX > variance) {
						if (!keys.length || keys.indexOf("right") >= 0) {
							trigger = true;
						}
					}
					// swipe left
					else if (diffX < 0 - variance) {
						if (!keys.length || keys.indexOf("left") >= 0) {
							trigger = true;
						}
					}
				}
				else {
					// swipe down
					if (diffY > variance) {
						if (!keys.length || keys.indexOf("down") >= 0) {
							trigger = true;
						}
					}
					// swipe up
					else if (diffY < 0 - variance) {
						if (!keys.length || keys.indexOf("up") >= 0) {
							trigger = true;
						}	
					}
				}
				if (trigger) {
					binding.value(event);
				}
			}
		}
		element.$$touchStop = function(event) {
			element.$$touches = null;
		}
		element.addEventListener("touchstart", element.$$touchStart); 
		element.addEventListener("touchmove", element.$$touchMove);
		element.addEventListener("touchstop", element.$$touchStop);
	},
	unbind: function(element, binding) {
		element.removeEventListener("touchstart", element.$$touchStart); 
		element.removeEventListener("touchmove", element.$$touchMove);
		element.removeEventListener("touchstop", element.$$touchStop);
	}
});
