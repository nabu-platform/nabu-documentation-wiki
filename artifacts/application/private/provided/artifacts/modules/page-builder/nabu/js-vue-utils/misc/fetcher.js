Vue.mixin({
	data: function() {
		return {
			$fetched: {}
		}
	},
	// we add some fetchers (if necessary)
	created: function() {
		if (this.$options.fetch) {
			var self = this;
			var createFetch = function(name, fetch, operation, operationParameters, mapper, resolve, inject) {
				var getAmountOfParams = function(f) {
					if (f) {
						var string = f.toString();
						if (typeof(string) == "string") {
							// can't do ".*" because there is no "dotall" modifier (though /s _does_ work on chrome, it does not on firefox)
							// instead [^]* will match any character that is not nothing...
							// but that does not work on server-side, so switch to [\s\S]
							var parameters = string.replace(/^[^(]*\(([^)]*)\)[\s\S]*/g, "$1").trim();
							if (parameters.length == 0) {
								return 0;
							}
							else {
								return parameters.split(",").length;
							}
						}
						else {
							throw "No stringification support for functions";
						}
					}
					return 0;
				}
				
				var amountOfInjected = inject
					? (inject instanceof Array ? inject.length : 1)
					: 0;
				
				var isFunction = (fetch instanceof Function && getAmountOfParams(fetch) > amountOfInjected)
					|| (operationParameters instanceof Function && getAmountOfParams(operationParameters) > amountOfInjected);

				// set initial value of null for resolved stuff
				self.$data.$fetched[name] = null;
				
				var state = {
					promise: null,
					originalPromise: null,
					name: name,
					first: null
				}
				
				var getter = function() {
					if (state.first == null) {
						state.first = true;
					}
					else {
						state.first = false;
					}
					var promise = state.promise;
					var originalPromise = state.originalPromise;
					var name = state.name;
					
					// we can still inject parameters
					var parameters = [];
					// we have an actual function, let's build parameters
					if (isFunction) {
						// because we update the name, the initial null set is wrong
						// this means we can not return the correct one until the function is called
						// this means we can not return the intermediate null value for watching
						if (resolve) {
							throw "You can not combine a function and a resolve requirement";
						}
						for (var i = 0; i < arguments.length; i++) {
							parameters.push(arguments[i]);
						}
						// we add the parameters so we can cache identical calls
						name += JSON.stringify(parameters);
						// we keep a special promise for each input combination
						originalPromise = self.$data.$fetched["_original_promise_" + name];
						promise = self.$data.$fetched["_promise_" + name];
					}
					if (!promise) {
						promise = self.$services.q.defer();
					}
					
					if (!originalPromise) {
						// if we have a string, we are dependent on another variable
						// that variable has to be a promise itself (e.g. through another fetch)
						if (fetch && typeof(fetch) == "string") {
							originalPromise = self[fetch];
						}
						// if we have a function, we want to execute it with the parameters we have received
						// and create a unique entry for those parameters
						else if (isFunction || fetch instanceof Function || operationParameters instanceof Function) {
							var operationParametersToUse = operationParameters;
							// we can inject other parameters that are promises, we want to wait for them to be resolved
							var promises = [];
							if (typeof(inject) == "string") {
								var parameter = self[inject];
								if (parameter.then) {
									promises.push(parameter);
								}
								parameters.push(parameter);
							}
							else if (inject instanceof Array) {
								for (var i = 0; i < inject.length; i++) {
									var parameter = self[inject[i]];
									if (parameter.then) {
										promises.push(parameter);
									}
									parameters.push(parameter);
								}
							}

							// we have at least some promises, we want to wait for them to be resolved
							if (promises.length) {
								originalPromise = self.$services.q.defer();
								self.$services.q.all(promises).then(function(results) {
									// all the promises are resolved, lets update the parameters array with the actual values
									for (var i = 0; i < parameters.length; i++) {
										if (parameters[i].then) {
											// this only works because we know our promise library immediately runs functions added by then
											// if the promise is already resolved
											parameters[i].then(function(result) {
												parameters[i] = result;
											});
										}
									}
									// now call the actual function and feedback the result to the original promise
									if (fetch instanceof Function) {
										var fetchResult = fetch.apply(self, parameters);
										console.log("fetch", name, fetchResult);
										if (fetchResult && fetchResult.then) {
											fetchResult.then(originalPromise, originalPromise);
										}
										else {
											originalPromise.resolve(typeof(fetchResult) == "undefined" ? null : fetchResult);
										}
									}
									else {
										operationParametersToUse = operationParameters.apply(self, parameters);
										self.$services.swagger.execute(operation, operationParametersToUse).then(originalPromise, originalPromise);
									}
								});
							}
							else {
								if (fetch instanceof Function) {
									originalPromise = fetch.apply(self, parameters);
								}
								else {
									operationParametersToUse = operationParameters.apply(self, parameters);
									originalPromise = self.$services.swagger.execute(operation, operationParametersToUse);
								}
							}
						}
						// if we get here and there are still functions, they have no input parameters
						else if (fetch) {
							originalPromise = fetch;
						}
						else {
							originalPromise = self.$services.swagger.execute(operation, operationParameters);
						}
						originalPromise.then(function(result) {
							if (typeof(result) == "undefined") {
								result = null;
							}
							else {
								if (mapper) {
									if (mapper instanceof Function) {
										result = mapper.call(self, result);
									}
									else if (mapper instanceof Array) {
										for (var i = 0; i < mapper.length; i++) {
											result = mapper[i].call(self, result);
										}
									}
								}
							}
							// we do a "clean" update
							if (self.$data.$fetched[name] instanceof Array && result instanceof Array) {
								self.$data.$fetched[name].splice(0, self.$data.$fetched[name].length);
								nabu.utils.arrays.merge(self.$data.$fetched[name], result);
							}
							else {
								self.$data.$fetched[name] = result;
							}
							promise.resolve(self.$data.$fetched[name]);
						}, promise);
						
						if (isFunction) {
							self.$data.$fetched["_original_promise_" + name] = originalPromise;
							self.$data.$fetched["_promise_" + name] = promise;
						}
						else {
							state.promise = promise;
							state.originalPromise = originalPromise;
						}
					}
					if (!promise.refresh) {
						promise.refresh = function() {
							// don't refresh if it is the first call
							// other by the simple act of getting the promise you initialize it once
							// and then immediately again by refreshing it
							if (!state.first) {
								this.state = null;
								// reset the original promise
								state.originalPromise = null;
								// trigger the get again with any arguments you gave
								var args = [];
								for (var i = 0; i < arguments.length; i++) {
									args.push(arguments[i]);
								}
								getter.apply(self, arguments);
							}
							return promise;
						};
					}
					if (!promise.resolved) {
						promise.resolved = function() {
							return self.$data.$fetched[name];
						}
					}
					return resolve ? self.$data.$fetched[name] : promise;
				}
				
				Object.defineProperty(self, name, { 
					enumerable: true,
					get: isFunction ? function() { return getter } : getter
				});
			};
			
			// TODO: add "fetch" support instead of operation: can start from an existing value
			for (var i = 0; i < this.$options.fetch.length; i++) {
				for (var key in this.$options.fetch[i]) {
					var value = this.$options.fetch[i][key];
					createFetch(
						key, 
						typeof(value) == "string" ? value : value.fetch, 
						typeof(value) == "string" ? value : value.operation, 
						typeof(value) == "string" ? null : value.parameters,
						typeof(value) == "string" ? null : value.map,
						typeof(value) == "string" ? null : value.resolve,
						typeof(value) == "string" ? null : value.inject
					);
				}
			}
		}
	}
});

Vue.config.optionMergeStrategies.fetch = Vue.config.optionMergeStrategies.activate;