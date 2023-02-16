<template id="custom-validator-edit">
	<n-collapsible title="Validations" class="page-validations list">
		<n-form-text v-model="cell.state.componentGroup" label="Component Group"/>
		<div class="list-actions">
			<button @click="addValidation">Add Validation</button>
		</div>
		
		<div v-if="cell.state.validations">
			<n-collapsible class="list-item" :title="validation.label ? validation.label : 'Unlabeled'" v-for="validation in cell.state.validations">
				<div slot="buttons">
					<button @click="deleteValidation(validation)"><span class="fa fa-trash"></span></button>
				</div>
				<n-form-text v-model="validation.label" label="Label" :timeout="600"/>
				<n-form-ace v-model="validation.condition" label="Condition to show message" info="Use the variable 'response' to access the response (if any)" :timeout="600"/>
				<n-form-text v-model="validation.code" label="Code" :timeout="600"/>
				<n-form-text v-model="validation.message" label="Message" :timeout="600"/>
				<n-form-combo v-model="validation.operationId" :filter="getOperations" label="Validation enrichment service"/>
				<n-form-text v-model="validation.operationSuccessEvent" v-if="validation.operationId" label="Operation Success Event" :timeout="600" @input="$updateEvents()"/>
				<n-page-mapper v-if="validation.operationId" v-model='validation.bindings' :from="availableParameters" :to="getOperationParameters(validation.operationId, true)"/>
			
				<div v-if="validation.operationId">
					<h2>Validation Codes<span class='subscript'>You can remap validation codes with different messages here</span></h2>
					<div v-if='validation.codes'>
						<div class='list-row' v-for='code in validation.codes' :timeout='600'>
							<n-form-text v-model='code.code' label='Code' :timeout='600'/>
							<n-form-text v-model='code.title' label='Title' :timeout='600'/>
							<span @click='validation.codes.splice(validation.codes.indexOf(code), 1)' class='fa fa-times'></span>
						</div>
					</div>
					<div class='list-actions'>
						<button @click="validation.codes ? validation.codes.push({code:null,title:null}) : $window.Vue.set(validation, 'codes', [{code:null,title:null}])"><span class="fa fa-plus"></span>Code</button>
					</div>
				</div>	
				<h4>Reset Listeners</h4>
				<p class="subscript">Whenever an event is emitted, you can clear the validation state.</p>
				<div class="list-item-actions">
					<button @click="validation.resetListeners ? validation.resetListeners.push({to:null, field: null}) : $window.Vue.set(validation, 'resetListeners', [{to:null,field:null}])"><span class="fa fa-plus"></span>Reset Listener</button>
				</div>
				<div v-if="validation.resetListeners">
					<div class="list-row" v-for="i in Object.keys(validation.resetListeners)">
						<n-form-combo v-model="validation.resetListeners[i].to" :filter="function(value) { return $services.page.getPageInstance(page, $self).getAvailableEvents() }" />
						<span @click="validation.resetListeners.splice(i, 1)" class="fa fa-times"></span>
					</div>
				</div>
			</n-collapsible>
		</div>
	</n-collapsible>
</template>

<template id="custom-validator">
	<div class="custom-validator" :component-group="cell.state.componentGroup ? cell.state.componentGroup : 'default'">
		<n-form>
			<div class="n-form-component n-form-invalid">
				<n-messages :messages="messages"></n-messages>
			</div>
		</n-form>
	</div>
</template>