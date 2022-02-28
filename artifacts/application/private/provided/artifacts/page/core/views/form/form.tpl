<template id="page-form-configure-all">
	<n-form class="layout2">
		<n-collapsible title="Form Settings" class="padded">
			<n-form-combo label="Operation" :value="operation" :filter="getOperations"
				@input="updateOperation"
				:formatter="function(x) { return x.id }"
				v-if="!cell.state.pageForm && !cell.state.functionForm"/>
			<n-form-switch label="Page form" v-model="cell.state.pageForm"
				v-if="!cell.state.operation && !cell.state.functionForm"/>
			<n-form-switch label="Function form" v-model="cell.state.functionForm"
				v-if="!cell.state.operation && !cell.state.pageForm"/>
			<n-form-combo label="Function" v-model="cell.state.functionId" v-if="cell.state.functionForm" 
				:filter="$services.page.listFunctions"/>
			<div class="list-actions">
				<button @click="generateForm"><span>Generate form</span></button>
			</div>
			<n-form-text v-model="cell.state.title" label="Title" :timeout="600"/>
			<n-form-text v-model="cell.state.formId" label="Form Id" :timeout="600"/>
			<n-form-text v-model="cell.state.componentGroup" label="Component Group" :timeout="600"/>
			<n-form-text v-model="cell.state.analysisId" label="Analysis Id" info="You can set an explicit name for this form for analysis purposes" :timeout="600"/>
			<n-form-text v-model="cell.state.class" label="Form Class" :timeout="600"/>
			<n-form-switch v-model="cell.state.immediate" label="Save On Change"/>
			<n-form-text v-model="cell.state.cancel" v-if="!cell.state.immediate" label="Cancel Label" :timeout="600"/>
			<n-form-text v-model="cell.state.ok" v-if="!cell.state.immediate" label="Ok Label" :timeout="600"/>
			<n-form-text v-model="cell.state.next" v-if="!cell.state.immediate && cell.state.pages.length > 1" label="Next Label" :timeout="600"/>
			<n-form-text v-model="cell.state.previous" v-if="!cell.state.immediate && cell.state.pages.length > 1" label="Previous Label" :timeout="600"/>
			<n-form-text v-model="cell.state.event" label="Success Event" :timeout="600" @input="$updateEvents()"/>
			<n-form-text v-model="cell.state.cancelEvent" label="Cancel Event" :timeout="600" @input="$updateEvents()"/>
			<n-form-text v-if="cell.state.event" v-model="cell.state.submitEvent" label="Submit Event" @input="$updateEvents()" :timeout="600"/>
			<n-form-text v-if="cell.state.operation || cell.state.functionForm" v-model="cell.state.errorEvent" label="Error Event" :timeout="600" @input="$updateEvents()" :timeout="600"/>
			<n-form-text v-model="cell.state.errorEventCodes" label="Error Event Codes" v-if="cell.state.errorEvent" :timeout="600"/>
			<n-form-switch v-if="!cell.state.pageForm && !cell.state.functionForm" v-model="cell.state.synchronize" label="Synchronize Changes"/>
			<n-form-switch v-model="cell.state.autofocus" label="Autofocus"/>
			<n-form-switch v-model="cell.state.autoclose" label="Autoclose"/>
			<n-form-switch v-if="cell.state.pages.length >= 2" v-model="cell.state.pageTabs" label="Pages as tabs"/>
			<n-form-switch v-if="cell.state.pages.length >= 2" v-model="cell.state.partialSubmit" label="Allow partial submit"/>
			<n-form-switch v-model="cell.state.allowReadOnly" label="Allow read only mode"/>
			<n-form-switch v-if="cell.state.allowReadOnly" v-model="cell.state.startAsReadOnly" label="Start in read only mode"/>
			<n-form-switch v-if="cell.state.allowReadOnly" v-model="cell.state.onlyOneEdit" label="Allow only one in edit mode"/>
			<n-form-text v-if="cell.state.allowReadOnly" v-model="cell.state.edit" label="Edit Label" :timeout="600"/>
			<n-form-text v-if="cell.state.allowReadOnly" v-model="cell.state.editIcon" label="Edit Icon" :timeout="600"/>
			<n-form-text v-model="cell.state.mode" label="Message Mode (the literal 'component' or a number)" :timeout="600"/>
			<n-form-text v-model="cell.state.formValidationMessages" label="Amount of validation messages to show at form level" placeholder="0"/>
			<n-form-text v-model="cell.state.validationTimeout" label="Validation Timeout" :timeout="600"/>
			<n-form-switch v-model="cell.state.validateOnBlur" label="Validate on blur"/>
			
			<div class="list-actions">
				<button @click="!cell.state.submitOnEvent ? $window.Vue.set(cell.state, 'submitOnEvent', [null]) : cell.state.submitOnEvent.push(null)"><span class="fa fa-plus"></span>Submit Event Listener</button>
			</div>
			<div class="padded-content" v-if="cell.state.submitOnEvent">
				<div v-for="i in Object.keys(cell.state.submitOnEvent)" class="list-row">
					<n-form-combo v-model="cell.state.submitOnEvent[i]"
						label="Submit on event"
						:filter="function(x) { return $services.page.getPageInstance(page, $self).getAvailableEvents() }"/>
					<span @click="cell.state.submitOnEvent.splice(i, 1)" class="fa fa-times"></span>
				</div>
			</div>
			
			<div class="list-actions">
				<button @click="!cell.state.cancelOnEvent ? $window.Vue.set(cell.state, 'cancelOnEvent', [null]) : cell.state.cancelOnEvent.push(null)"><span class="fa fa-plus"></span>Cancel Event Listener</button>
			</div>
			<div class="padded-content" v-if="cell.state.cancelOnEvent">
				<div v-for="i in Object.keys(cell.state.cancelOnEvent)" class="list-row">
					<n-form-combo v-model="cell.state.cancelOnEvent[i]"
						label="Cancel on event"
						:filter="function(x) { return $services.page.getPageInstance(page, $self).getAvailableEvents() }"/>
					<span @click="cell.state.cancelOnEvent.splice(i, 1)" class="fa fa-times"></span>
				</div>
			</div>
		</n-collapsible>
		<n-collapsible title="Value Binding" v-if="!cell.state.pageForm">
			<div class="list-row">
				<n-form-combo :items="Object.keys(availableParameters)" v-model="autoMapFrom"/>
				<button @click="automap" :disabled="!autoMapFrom">Automap</button>
			</div>
			<div class="padded-content">
				<n-page-mapper :to="fieldsToAdd" :from="availableParameters" 
					v-model="cell.bindings"/>
			</div>
		</n-collapsible>
		<n-collapsible title="Validation Codes">
			<div v-if="cell.state.codes">
				<div class="list-row" v-for="code in cell.state.codes">
					<n-form-text v-model="code.code" label="Code" :timeout='600'/>
					<n-form-text v-model="code.title" label="Title" :timeout='600'/>
					<span @click="cell.state.codes.splice(cell.state.codes.indexOf(code), 1)" class="fa fa-times"></span>
				</div>
			</div>
			<div class="list-actions">
				<button @click="cell.state.codes ? cell.state.codes.push({code:null,title:null}) : $window.Vue.set(cell.state, 'codes', [{code:null,title:null}])">Add code</button>
			</div>
		</n-collapsible>
		<div v-for="cellPage in cell.state.pages">
			<page-form-configure :title="cellPage.name"
				:allow-read-only="cell.state.allowReadOnly"
				:schema-resolver="getSchemaFor"
				:groupable="true"
				:edit-name="true"
				:fields="cellPage.fields" 
				:is-list="isList"
				:possible-fields="fieldsToAdd"
				:page="page"
				@input="function(newValue) { cellPage.name = newValue }"
				:cell="cell"
				root-tag="div"
				:dark="true"/>
			<div class="padded-content">
				<n-form-text v-model="cellPage.disabledIf" label="Disabled if" v-if="!cellPage.enabledIf"/>
				<n-form-text v-model="cellPage.enabledIf" label="Enabled if" v-if="!cellPage.disabledIf"/>
			</div>
			<div class="list-actions">
				<span>Page Actions: </span>
				<button v-if="$services.page.isCopied('page-form-field')" @click="function() { pasteField(cellPage) }"><span class="fa fa-paste"></span></button>
				<button @click="$services.page.copyItem('page-form-page', cellPage, true)"><span class="fa fa-copy"></span></button>
				<button v-if="cell.state.pages.length > 1" @click="upAllPage(cellPage)"><span class="fa fa-chevron-circle-left"></span></button>
				<button v-if="cell.state.pages.length > 1" @click="upPage(cellPage)"><span class="fa fa-chevron-circle-up"></span></button>
				<button v-if="cell.state.pages.length > 1" @click="downPage(cellPage)"><span class="fa fa-chevron-circle-down"></span></button>
				<button v-if="cell.state.pages.length > 1" @click="downAllPage(cellPage)"><span class="fa fa-chevron-circle-right"></span></button>
				<button v-if="false" @click="copyPage(cellPage)"><span class="fa fa-copy"></span></button>
				<button v-if="cell.state.pages.length > 1" @click="deletePage(cellPage)">Delete Page '{{cellPage.name}}'</button>
			</div>
		</div>
		<div class="list-actions">
			<button v-if="$services.page.isCopied('page-form-page')" @click="pastePage"><span class="fa fa-paste"></span></button>
			<button @click="addPage"><span class="fa fa-plus"></span>Form Page</button>
		</div>
	</n-form>
</template>
<template id="page-form">
	<div class="page-form"
			@drop="drop($event)" 
			@dragover="dragOver($event)"
			@dragexit="dragExit($event)">
	
		<div class="form-tabs" v-if="cell.state.pages.length >= 2 && (cell.state.pageTabs || edit)">
			<button v-for="page in cell.state.pages" :disabled="!isPageActive(page)" @click="setPage(page)"
				:class="{'is-active': currentPage == page}"><span>{{$services.page.interpret($services.page.translate(page.name), self)}}</span></button>
		</div>
		<h2 v-if="cell.state.title">{{$services.page.translate($services.page.interpret(cell.state.title, $self))}}</h2>
		<n-form class="p-form" :class="[cell.state.class, {'form-read-only': readOnly, 'form-edit': !readOnly}, {'form-error': !!error }]" ref="form" :id="cell.state.formId" :component-group="cell.state.componentGroup" 
				:mode="cell.state.mode">
			<header class="p-form-header" slot="header" v-if="cell.state.dynamicHeader"><component :is="cell.state.dynamicHeader" :form="$self" :page="page" :cell="cell"/></header>
			<n-form-section class="p-form-section" :key="'form_page_' + cell.state.pages.indexOf(currentPage)">
				<n-form-section class="p-form-section" v-for="group in getGroupedFields(currentPage)" :class="group.group">
					<n-form-section class="p-form-section" v-for="field in group.fields" :key="field.name + '_section'" v-if="!isPartOfList(field.name) && !isHidden(field) && (!readOnly || !field.hideInReadOnly)">
						<component v-if="isList(field.name)"
							:read-only="readOnly"
							:is="getProvidedListComponent(field.type)"
							:value="result"
							:page="page"
							:cell="cell"
							:edit="edit"
							:field="field"
							@changed="changed"
							:timeout="600"
							:schema="getSchemaFor(field.name)"/>
						<page-form-field v-else-if="!field.arbitrary" :key="field.name + '_value'" :field="field" :schema="getSchemaFor(field.name)" 
							:value="getCurrentValue(field)"
							:parent-value="result"
							:schema-resolver="getSchemaFor"
							@changed="changed"
							@input="function(newValue, otherField) { $window.Vue.set(result, otherField ? otherField : field.name, newValue); changed(field.name); }"    
							:timeout="600"
							:page="page"
							:read-only="readOnly"
							:cell="cell"
							:codes="cell.state.codes"
							:is-disabled="isDisabled(field)"
							@label="function(value) { $window.Vue.set(labels, field.name, value) }"
							v-focus="cell.state.autofocus == true && currentPage.fields.indexOf(field) == 0"
							:validate-timeout="cell.state.validationTimeout"
							:validate-on-blur="cell.state.validateOnBlur"/>
						<page-arbitrary v-else-if="!isHidden(field)"
							:edit="edit"
							:page="page"
							:cell="cell"
							:target="field"
							:component="form"/>
					</n-form-section>
				</n-form-section>
			</n-form-section>
			<footer class="p-form-footer" slot="footer">
				<footer v-if="cell.state.dynamicFooter" class="footer-custom"><component :is="cell.state.dynamicFooter" :read-only="readOnly" :form="$self" :page="page" :cell="cell"/></footer>
				<footer v-else-if="readOnly" class="footer-edit">
					<button class="form-edit" :id="cell.state.formId ? cell.state.formId + '_edit' : null" @click="readOnly = false" v-if="cell.state.edit || cell.state.editIcon">
						<span class="fa" :class="cell.state.editIcon" v-if="cell.state.editIcon"></span>
						<span>{{$services.page.translate($services.page.interpret(cell.state.edit, $self))}}</span>
					</button>
				</footer>
				<footer class="global-actions footer-standard" v-else-if="!cell.state.immediate">
					<a class="p-link cancel" :disabled="doingIt" href="javascript:void(0)" @click="cancel" :id="cell.state.formId ? cell.state.formId + '_cancel' : null" 
						v-if="cell.state.cancel && (!cell.state.previous || cell.state.pages.indexOf(currentPage) == 0)">{{$services.page.translate($services.page.interpret(cell.state.cancel, $self))}}</a>
					<a class="p-link previous" :disabled="doingIt" href="javascript:void(0)" @click="previousPage" :id="cell.state.formId ? cell.state.formId + '_previous' : null" 
						v-if="cell.state.previous && cell.state.pages.indexOf(currentPage) > 0">{{$services.page.translate($services.page.interpret(cell.state.previous, $self))}}</a>
					<button class="p-button primary" :id="cell.state.formId ? cell.state.formId + '_next' : null" @click="nextPage" 
						v-if="cell.state.next && hasNextActivePage(currentPage)">{{$services.page.translate($services.page.interpret(cell.state.next, $self))}}</button>
					<button :disabled="doingIt" class="p-button primary" :id="cell.state.formId ? cell.state.formId + '_submit' : null" @click="doIt" 
						v-else-if="cell.state.ok">{{$services.page.translate($services.page.interpret(cell.state.ok, $self))}}</button>
					<button class="p-button secondary" :id="cell.state.formId ? cell.state.formId + '_submit' : null" @click="doIt" 
						:disabled="doingIt"
						v-if="cell.state.pages.length >= 2 && cell.state.partialSubmit && cell.state.next && cell.state.pages.indexOf(currentPage) < cell.state.pages.length - 1 && cell.state.ok">{{$services.page.translate($services.page.interpret(cell.state.ok, $self))}}</button>
				</footer>
				<footer class="footer-messages">
					<n-messages :messages="messages"/>
				</footer>
			</footer>
		</n-form>
	</div>
</template>

<template id="page-form-field">
	<component
		:readOnly="readOnly"
		:placeholder="field.placeholder ? $services.page.translate(field.placeholder) : null"
		class="page-form-field"
		:class="fieldClasses(field)"
		:is="getProvidedComponent(field.type)"
		:value="usesMultipleFields(field.type) ? parentValue : value"
		:parent-value="parentValue"
		:page="page"
		:codes="codes"
		:cell="cell"
		@blur="blur"
		:field="field"
		@input="function(newValue, otherField) { $emit('input', newValue, otherField); slowValidate(); }"
		v-bubble:label
		v-bubble:changed
		:label="field.hideLabel ? null : $services.page.translate($services.page.interpret(fieldLabel, $self))"
		:timeout="timeout"
		:schema="schema"
		:schema-resolver="schemaResolver"
		:disabled="isDisabled"/>
</template>

<template id="page-form-configure">
	<component :is="rootTag" class="list" :title="title">
		<div class="root-configuration">
			<n-form-text :value="title" label="Form Page Name" v-if="editName" v-bubble:input/>
		</div>
		<div class="list-actions">
			<button @click="addField(false)"><span class="fa fa-plus"></span>Field</button>
			<button @click="addField(true)"><span class="fa fa-plus"></span>Content</button>
		</div>
		<n-collapsible v-for="field in fields" :title="field.label ? field.label : field.name" :class="{'dark': dark}">
			<div slot="buttons">
				<button @click="$services.page.copyItem('page-form-field', field, true)"><span class="fa fa-copy"></span></button>
				<button @click="upAll(field)" v-if="false"><span class="fa fa-chevron-circle-left"></span></button>
				<button @click="up(field)"><span class="fa fa-chevron-circle-up"></span></button>
				<button @click="down(field)"><span class="fa fa-chevron-circle-down"></span></button>
				<button @click="downAll(field)" v-if="false"><span class="fa fa-chevron-circle-right"></span></button>
				<button @click="fields.splice(fields.indexOf(field), 1)"><span class="fa fa-trash"></span></button>
			</div>
			<div class="padded-content">
				<page-configure-arbitrary v-if="field.arbitrary" 
					:page="page"
					:cell="cell"
					:target="field"
					:keys="possibleFields"/>
					
				<page-form-configure-single v-else :field="field" :possible-fields="possibleFields"
					:groupable="groupable"
					:hidable="true"
					:is-list="isList"
					:page="page"
					:schema="schemaResolver(field.name)"
					:cell="cell"/>
					
				<n-form-switch v-model="field.hideInReadOnly" v-if="allowReadOnly" label="Hide In Read Only Mode"/>
				<n-form-combo :filter="function(x) { return possibleFields }" v-model="field.resetOnUpdate" label="Reset on update"/>
			</div>
		</n-collapsible>
		<div class="list-actions" v-if="allowPaste">
			<button v-if="$services.page.isCopied('page-form-field')" @click="function() { pasteField(cellPage) }"><span class="fa fa-paste"></span></button>
		</div>
	</component>
</template>

<template id="page-form-configure-single">
	<div class="page-form-single-field">
		<n-form-combo v-model="field.name" label="Field Name" :filter="filterFieldNames" v-if="!usesMultipleFields(field.type)"/>
		<n-form-text v-model="field.label" label="Label" v-if="allowLabel" />
		<n-form-text v-model="field.placeholder" label="Placeholder" />
		<n-form-text v-model="field.hidden" label="Hide field if" v-if="hidable" />
		<n-form-text v-model="field.disabled" label="Disable field if" />
		<n-form-text v-model="field.group" label="Field Group" v-if="groupable && !field.joinGroup" />
		<n-form-checkbox v-model="field.joinGroup" label="Join Field Group" v-if="groupable && !field.group" />
		<n-form-text v-model="field.description" label="Description" v-if="false && allowDescription" />
		<n-form-combo v-model="field.descriptionType" label="Description type" v-if="field.description" :items="['info','before','after']"/>
		<n-form-text v-model="field.descriptionIcon" label="Description icon" v-if="field.description"/>
		<n-form-combo v-model="field.type" :filter="filterTypes" label="Type"/>
		<n-form-text v-model="field.value" v-if="field.type == 'fixed'" label="Fixed Value"/>
		<n-form-switch v-model="field.hideLabel" label="Hide label"/>
		<component v-if="field.type && ['fixed'].indexOf(field.type) < 0"
			:possible-fields="possibleFields"
			:is="getProvidedConfiguration(field.type)"
			:page="page"
			:cell="cell"
			:schema="schema"
			:field="field"/>
			
		<page-event-value class="no-more-padding" :page="page" :container="field" title="Validation Success Event" name="validationSuccessEvent" @resetEvents="$updateEvents()" :inline="true"/>
		
		<div class="list-actions">
			<button @click="field.styles == null ? $window.Vue.set(field, 'styles', [{class:null,condition:null}]) : field.styles.push({class:null,condition:null})"><span class="fa fa-plus"></span>Style</button>
		</div>
		<div v-if="field.styles">
			<n-form-section class="list-row" v-for="style in field.styles">
				<n-form-text v-model="style.class" label="Class"/>
				<n-form-text v-model="style.condition" label="Condition"/>
				<button @click="field.styles.splice(field.styles.indexOf(style), 1)"><span class="fa fa-trash"></span></button>
			</n-form-section>
		</div>
		
		<h4>Update Listener</h4>
		<p class="subscript">Whenever an event is emitted, you can capture a value from it by configuring an update listener.</p>
		<div class="list-item-actions">
			<button @click="field.listeners ? field.listeners.push({to:null, field: null}) : $window.Vue.set(field, 'listeners', [{}])"><span class="fa fa-plus"></span>Update Listener</button>
		</div>
		<div v-if="field.listeners">
			<div class="list-row" v-for="i in Object.keys(field.listeners)">
				<n-form-combo v-model="field.listeners[i].to" :filter="function(value) { return $services.page.getAllAvailableKeys(page, true, value) }" />
				<n-form-combo v-model="field.listeners[i].field" v-if="field.type && field.type.indexOf('.') >= 0" :filter="listFields.bind($self, field.type)" />
				<span @click="field.listeners.splice(i, 1)" class="fa fa-times"></span>
			</div>
		</div>
	</div>
</template>

<template id="page-configure-arbitrary">
	<div class="page-configure-arbitrary">
		<n-form-text v-model="target.label" label="Label"/>
		<n-form-text v-model="target.class" label="Class"/>
		<n-form-combo v-model="target.route" label="Route" :filter="filterRoutes"/>
		<n-page-mapper v-if="target.route" :to="getTargetParameters(target)"
			:from="availableParameters" 
			v-model="target.bindings"/>
		<n-form-ace v-model="target.hidden" label="Hide If"/>
		<p class="subscript" v-if="instance == null">Not seeing your configuration options? Make sure at least one instance is rendered.</p>
		<component v-if="hasConfigurator" :is="getCellConfigurator(cell)" v-bind="getCellConfiguratorInput(cell)"/>
	</div>
</template>

<template id="page-arbitrary">
	<div class="page-arbitrary">
		<div @click.native="handle" :class="target.class" v-route-render="{ alias: target.route, parameters: getParameters(), mounted: mounted, created:created }"></div>
	</div>
</template> 