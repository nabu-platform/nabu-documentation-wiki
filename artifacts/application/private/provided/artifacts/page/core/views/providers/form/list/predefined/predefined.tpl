<template id="page-form-list-input-predefined">
	<div class="page-form-list-input-predefined">
		<n-form-section ref='form'>
			<n-form-section v-for="field in fields">
				<n-form-date :label="field.label" v-model="field.value" v-if="field.type == 'date'" v-bind="field.additional"
					:required="!field.optional"
					@input="function(value) { updateField(field, value) }"/>
				<n-form-checkbox :label="field.label" v-model="field.value" v-else-if="field.type == 'boolean'" v-bind="field.additional"
					:required="!field.optional"
					@input="function(value) { updateField(field, value) }"/>
				<n-form-text :label="field.label" v-model="field.value" v-else v-bind="field.additional"
					:type="field.type"
					:required="!field.optional"
					@input="function(value) { updateField(field, value) }"/>
			</n-form-section>
			<div v-if="!fields.length && field.emptyPlaceholder">{{$services.page.translate(field.emptyPlaceholder)}}</div>
		</n-form-section>
	</div>	
</template>

<template id="page-form-list-input-predefined-configure">
	<n-form-section>
		<n-form-combo  v-model="field.resultKeyField" label="Resulting name field"
			:items="availableResultFields"/>
		<n-form-combo v-model="field.resultValueField" label="Resulting value field"
			:items="availableResultFields"/>
			
		<n-form-text v-model="field.emptyPlaceholder" label="Empty placeholder"/>
		<n-form-combo :filter="listOperations" label="Field Provider Operation" v-model="field.fieldProviderOperation"/>
		<n-form-combo v-model="field.nameField" label="Provider Name Field" :required="true" v-if="field.fieldProviderOperation"
			:items="availableFields"/>
		<n-form-combo v-model="field.labelField" label="Provider Label Field" v-if="field.fieldProviderOperation"
			:items="availableFields"/>
		<n-form-combo v-model="field.typeField" label="Provider Type Field" v-if="field.fieldProviderOperation"
			:items="availableFields"/>
		<n-form-combo v-model="field.valueField" label="Provider (Existing) Value Field" v-if="field.fieldProviderOperation"
			:items="availableFields"/>
		<n-form-combo v-model="field.optionalField" label="Provider Optional Field" v-if="field.fieldProviderOperation"
			:items="availableFields"/>
		<n-page-mapper v-if='field.fieldProviderOperation && hasMappableParameters(field)'
			v-model='field.fieldOperationBinding'
			:from='$services.page.getAvailableParameters(page, cell, true)'
			:to='getMappableParameters(field)'/>
	</n-form-section>
</template>