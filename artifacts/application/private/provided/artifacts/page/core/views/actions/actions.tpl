<template id="page-actions-configure">
	<div>
		<n-collapsible title="Action Settings" v-if="!actions" class="padded">
			<n-form-combo v-model="cell.state.class" label="Class" 
				:filter="function(value) { return $services.page.classes('page-actions', value) }"/>
			<n-form-text v-model="cell.state.activeClass" label="Active Class" info="The class that is set on the active action, this defaults to 'is-active'" :timeout="600"/>
			<n-form-text v-model="cell.state.analysisId" label="Analysis Group" info="For analysis purposes we can group all the actions together" :timeout="600" />
			<n-form-combo v-model="cell.state.defaultAction" label="Default Action" info="The default action will be activated upon first creation. You must fill in the name of the action to select it."
				:filter="function() { return cell.state.actions.map(function(x) { return x.name }) }"/>
			<n-form-switch v-model="cell.state.useButtons" label="Use Buttons"/>
			<n-form-switch v-model="cell.state.isFixedHeader" label="Fix as header"/>
			<n-form-switch v-model="cell.state.clickBased" label="Use Clicks Instead of Hover"/>
			<n-form-switch v-model="cell.state.showOnlyOne" label="Only allow one open" v-if="cell.state.clickBased"/>
			<n-form-switch v-model="cell.state.leaveOpen" label="Leave Open" v-if="cell.state.clickBased"/>
			<n-form-switch v-model="cell.state.autoActions" label="Automatically generate actions for all pages"/>
		</n-collapsible>
		<div v-if="!cell.state.autoActions">
			<div class="list-actions">
				<button v-if="$services.page.isCopied('page-action')" @click="paste"><span class="fa fa-paste"></span></button>
				<button @click="addAction(false)"><span class="fa fa-plus"></span>Static</button>
				<button @click="addAction(true)"><span class="fa fa-plus"></span>Dynamic</button>
				<button @click="addContent()"><span class="fa fa-plus"></span>Content</button>
			</div>
			<n-collapsible class="list-item dark" :title="action.label ? action.label : action.name" v-for="action in getActions()">
				<div slot="buttons">
					<button @click="$services.page.copyItem('page-action', action)"><span class="fa fa-copy"></span></button>
					<button @click="up(action)"><span class="fa fa-chevron-circle-up"></span></button>
					<button @click="down(action)"><span class="fa fa-chevron-circle-down"></span></button>
					<button @click="getActions().splice(getActions().indexOf(action), 1)"><span class="fa fa-trash"></span></button>
				</div>
				
				<div v-if="action.arbitrary" class="padded-content">
					<page-configure-arbitrary v-if="action.arbitrary" 
						:page="page"
						:cell="cell"
						:target="action"
						:keys="$services.page.getAvailableParameters(page, cell)"/>
				</div>
				<div v-else class="padded-content">
					<n-form-text v-model="action.name" label="Name" info="The name is used for analytics purposes, check the console to see how this works" :timeout="600"/>
					<n-form-section v-if="action.dynamic">
						<n-form-combo v-model="action.operation" label="Operation" :filter="getActionOperations"/>
						<n-page-mapper :to="getInputParameters(action)" 
							:from="$services.page.getAvailableParameters(page, cell, true)" 
							v-if="action.operation"
							v-model="action.bindings"/>
						<n-form-combo label="Label" v-if="action.operation" v-model="action.label" :filter="getOperationProperties.bind($self, action)"/>
						<n-form-combo label="Icon" v-if="action.operation" v-model="action.icon" :filter="getOperationProperties.bind($self, action)"/>
						<n-form-switch label="Autotrigger" v-model="action.autotrigger"/>
					</n-form-section>
					<n-form-section v-else>
						<n-form-text v-model="action.label" label="Label" v-if="!action.compileLabel" :timeout="600"/>
						<n-form-ace v-model="action.label" label="Label" v-else/>
						<n-form-switch v-model="action.compileLabel" label="Compile"/>
						<n-form-text v-model="action.id" label="Id" :timeout="600"/>
						<n-form-text v-model="action.icon" label="Icon" :timeout="600"/>
					</n-form-section>
	
					<n-form-combo v-model="action.class" label="Class" :filter="$services.page.classes.bind($self, 'page-action')" :timeout="600" />
					<n-form-combo v-model="action.buttonClass" label="Button Class" :filter="$services.page.getSimpleClasses" :timeout="600"/>
					
					<n-form-combo v-model="action.event" v-if="false && !action.route && !action.url" label="Event" :filter="function(value) { return value ? [value, '$close'] : ['$close'] }"
						 @input="$updateEvents()" :timeout="600"/>
						 
					<n-form-switch v-model="action.close" label="Close"/>
					
					<n-form-section v-if="!action.dynamic">
						<n-form-combo v-model="action.route" v-if="(!action.event || !action.event.name) && !action.url" :filter="listRoutes" label="Route"/>
						<n-form-combo v-model="action.anchor" v-if="action.route" label="Anchor" :filter="function(value) { return value ? [value, '$blank', '$window'] : ['$blank', '$window'] }"/>
						<n-form-switch v-model="action.absolute" v-if="action.route && !cell.state.useButtons" label="Absolute"/>
						<n-form-switch v-model="action.mask" label="Mask" v-if="action.route"/>
						<n-form-text v-model="action.url" label="URL" v-if="!action.route && (!action.event || !action.event.name)" :timeout="600"/>
						<n-form-combo v-model="action.anchor" v-if="action.url" label="Anchor" :items="['$blank', '$window']"/>
						<n-page-mapper v-if="action.route && $services.router.get(action.route)" :to="$services.page.getRouteParameters($services.router.get(action.route))"
							:from="$services.page.getAvailableParameters(page, cell)" 
							v-model="action.bindings"/>
						<page-event-value :inline="true" class="no-more-padding" :page="page" :container="action" title="Action Event" v-if="!action.dynamic && !action.route && !action.url" name="event" 
						 	@updatedEvents="$updateEvents()"/>
						 	
						<div class="n-form-component n-form-ace">
							<label class="n-form-label">Disabled if</label>
							<n-ace mode="javascript" v-model="action.disabled"/>
						</div>
						<div class="n-form-component n-form-ace">
							<label class="n-form-label">Show if</label>
							<n-ace mode="javascript" v-model="action.condition"/>
						</div>
						<n-form-combo v-model="action.validate" label="Only if valid" :filter="validatableItems" info="This action is only triggerable if the indicated item or group of items is valid"/>
						<n-form-text info="The event to send out if we have a validation error" v-if="action.validate" v-model="action.validationErrorEvent" label="Validation Error Event" :timeout="600" />
						<n-form-switch info="Whether we want to scroll to the first exception" v-if="action.validate" v-model="action.validationErrorScroll" label="Scroll to Validation Error" />
					</n-form-section>
				</div>
				
				<div class="list-item-actions" v-if="!action.arbitrary">
					<button @click="action.triggers ? action.triggers.push('') : $window.Vue.set(action, 'triggers', [''])"><span class="fa fa-plus"></span>Trigger<n-info>You can have this action trigger when another event occurs.</n-info></button>
				</div>
				<div v-if="action.triggers" class="padded-content">
					<div class="list-row" v-for="i in Object.keys(action.triggers)">
						<n-form-combo v-model="action.triggers[i]" label="Trigger" :items="$window.Object.keys($services.page.getAllAvailableParameters(page))"/>
						<span @click="action.triggers.splice(i, 1)" class="fa fa-times"></span>
					</div>
					<n-form-switch v-model="action.triggerIfHidden" v-if="action.triggers.length && action.condition" label="Allow trigger if hidden"/>
				</div>
				
				<div class="list-item-actions" v-if="!action.arbitrary">
					<button @click="action.activeRoutes.push('')"><span class="fa fa-plus"></span>Active Route<n-info>When is this action considered active (apart from the route you can already assign)?</n-info></button>
				</div>
				<div class="list-row padded-content" v-for="i in Object.keys(action.activeRoutes)">
					<n-form-combo v-model="action.activeRoutes[i]" label="Active Route" :filter="function(value) { return listRoutes(value, true) }"/>
					<span @click="action.activeRoutes.splice(i, 1)" class="fa fa-times"></span>
				</div>
				
				<n-collapsible title="Style">
					<div class="list-item-actions">
						<button @click="addStyle(action)"><span class="fa fa-plus"></span>Style</button>
					</div>
					<div v-if="action.styles" class="padded-content">
						<n-form-section class="list-row" v-for="style in action.styles">
							<n-form-text v-model="style.class" label="Class"/>
							<n-form-text v-model="style.condition" label="Condition"/>
							<span class="fa fa-times" @click="action.styles.splice(action.styles.indexOf(style), 1)"></span>
						</n-form-section>
					</div>
				</n-collapsible>
	
			</n-collapsible>
		</div>
	</div>
</template>

<template id="page-actions">
	<ul class="page-actions" :class="[cell.state.class, {'page-actions-root': actions == null }, {'page-actions-child': actions != null }]" v-auto-close.actions="autoclose"
			v-fixed-header="cell.state.isFixedHeader != null && cell.state.isFixedHeader == true">
		<li v-for="action in (isAutoCalculated ? autoActions : (edit ? getActions() : resolvedActions.filter(function(x) { return !x.dynamic})))" v-if="isVisible(action)"
				class="page-action"
				:class="[{ 'has-children': action.actions != null && action.actions.length }, action.class, {'click-based': cell.state.clickBased}, {'is-open': showing.indexOf(action) >= 0}]"
				@mouseover="show(action)" @mouseout="hide(action)"
				:sequence="(isAutoCalculated ? autoActions : (edit ? getActions() : resolvedActions)).indexOf(action) + 1">
			
			<n-sidebar class="page-settings" v-if="configuringAction" :inline="true" @close="configuringAction = null" :autocloseable="false">
				<component is="page-actions-configure" :cell="cell" :page="page" :edit="edit" :actions="configuringAction.actions"/>
			</n-sidebar>
			
			<page-arbitrary v-if="action.arbitrary"
				:edit="edit"
				:page="page"
				:cell="cell"
				:target="action"
				:component="$self"/>
			
			<template v-else>
				<span v-if="edit && !action.dynamic" class="fa fa-cog" @click="configureAction(action)"></span>
				<a auto-close-actions class="page-action-link page-action-entry" :href="getActionHref(action)"
					:data-event="action.name"
					:target="action.anchor == '$blank' ? '_blank' : null"
					:class="getDynamicClasses(action)"
					:sequence="(edit ? getActions() : resolvedActions).indexOf(action) + 1"
					:disabled="isDisabled(action)"
					:id="$services.page.interpret(action.id, $self)"
					@click="handle(action)"
					v-if="!cell.state.useButtons && (action.route || hasEvent(action) || action.url || action.close)"
						><html-fragment v-if="action.icon" :html="$services.page.getIconHtml(action.icon)"></html-fragment
						><span v-content.parameterized="{value:$services.page.translate($services.page.interpret(action.label, $self)), sanitize:!action.compileLabel, compile: !!action.compileLabel, plain: !action.compileLabel }"></span></a>
				<button auto-close-actions class="page-action-button page-action-entry"
					:data-event="action.name"
					:class="getDynamicClasses(action)"
					:sequence="(edit ? getActions() : resolvedActions).indexOf(action) + 1"
					:disabled="isDisabled(action)"
					:id="$services.page.interpret(action.id, $self)"
					@click="handle(action)" 
					v-else-if="cell.state.useButtons && (action.route || hasEvent(action) || action.url || action.close)"
						><html-fragment v-if="action.icon" :html="$services.page.getIconHtml(action.icon)"></html-fragment
						><span v-content.parameterized="{value:$services.page.translate($services.page.interpret(action.label, $self)), sanitize:!action.compileLabel, compile: !!action.compileLabel, plain: !action.compileLabel }"></span></button>
				<span class="page-action-label page-action-entry" 
					@click="toggle(action)"
					v-else
					:class="getDynamicClasses(action)"
					:sequence="(edit ? getActions() : resolvedActions).indexOf(action) + 1"
						><html-fragment v-if="action.icon" :html="$services.page.getIconHtml(action.icon)"></html-fragment
						><span v-content.parameterized="{value:$services.page.translate($services.page.interpret(action.label, $self)), sanitize:!action.compileLabel, compile: !!action.compileLabel, plain: !action.compileLabel }"></span></span>
				<page-actions :ref="'action_' + (edit ? getActions() : resolvedActions).indexOf(action)"
					v-if="(action.actions && action.actions.length) || configuringAction == action"
					:cell="cell"
					:page="page"
					:parameters="parameters"
					:edit="edit"
					:local-state="localState"
					:actions="action.actions"
					@close="$emit('close')"
					v-show="(edit && false) || showing.indexOf(action) >= 0"/>
			</template>
		</li>
		<li v-if="edit && !getActions().length && !cell.state.autoActions" class="page-placeholder"><button class="page-placeholder" @click="addAction(false);"><span class="fa fa-plus"></span>Static</button><button class="page-placeholder" @click="addAction(true);configure()"><span class="fa fa-plus"></span>Dynamic</button></li>
	</ul>
</template>
