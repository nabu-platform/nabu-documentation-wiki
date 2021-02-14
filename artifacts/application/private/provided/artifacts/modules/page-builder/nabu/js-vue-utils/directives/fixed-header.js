// this directive takes a header (presumed at the top of the page) and will slide it away when you scroll down
// the first time you scroll up however, the menu pops back up
Vue.directive("fixed-header", {
	bind: function(element, binding) {
		var result = binding.value;
		if (result != null && result == false) {
			return;
		}
		var originalPosition = element.style.position;
		var originalMargin = element.style.marginBottom;
		
		element.style.transition = "position 0.3s linear, top 0.3s linear";
		var y = window.pageYOffset + element.getBoundingClientRect().top;
		var height = element.getBoundingClientRect().height;
		var toggled = false;
		var div = document.createElement("div");
		div.setAttribute("class", "fixed-header-spacer");
		var inserted = false;
		element["$n-fixed-header-listener"] = function(event) {
			if (!inserted && element.parentNode) {
				inserted = true;
				element.parentNode.insertBefore(div, element);
			}
			if (height == 0) {
				height = element.getBoundingClientRect().height;
			}
			if (y == 0 && element.style.position != "fixed") {
				y = window.pageYOffset + element.getBoundingClientRect().top;
			}
			// this kicks in the first time it goes out of view
			if (element.getBoundingClientRect().top < 0 && element.style.position != "fixed") {
				div.style.height = height + "px";
				element.style.position = "fixed";
				element.style.top = "0px";
				element.style.marginBottom = height + "px";
				element.setAttribute("fixed", "true");
				toggled = true;
			}
			// turn it off if we scroll up again
			else if (element.style.position == "fixed" && window.pageYOffset < y) {
				div.style.height = "0px";
				element.style.position = originalPosition;
				element.style.marginBottom = originalMargin;
				element.removeAttribute("fixed");
			}
		};
		window.addEventListener("scroll", element["$n-fixed-header-listener"]);
	},
	unbind: function(element) {
		if (element["$n-fixed-header-listener"]) {
			console.log("Removing event listener");
			window.removeEventListener("scroll", element["$n-fixed-header-listener"]);
		}
	}
});