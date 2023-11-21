<template id="nabu-pages">
	<div class="pages">
		<h1 class="main">{{ $services.page.title ? $services.page.title : 'My Website'}}<span class="subscript">Powered by Nabu</span></h1>
		<div class="tabs is-grid-row is-menu is-variant-toolbar">
			<div class="tab is-grid-column" @click="selectedTab = 'settings'" :class="{'selected': selectedTab == 'settings' }"><span class="fa fa-cogs"></span>Settings</div>
			<div class="tab is-grid-column" @click="selectedTab = 'pages'" :class="{'selected': selectedTab == 'pages' }"><span class="fa fa-file-alt"></span>Pages</div>
			<div class="tab is-grid-column" @click="selectedTab = 'styles'" :class="{'selected': selectedTab == 'styles' }"><span class="fa fa-file-image"></span>Style</div>
			<div class="tab is-grid-column" @click="selectedTab = 'functions'" :class="{'selected': selectedTab == 'functions' }"><span class="fa fa-file-code"></span>Script</div>
			<div v-if="false" class="tab is-grid-column" @click="selectedTab = 'bundles'" :class="{'selected': selectedTab == 'bundles' }"><span class="fa fa-cube"></span>Bundles</div>
			<div v-for="entry in getAdditionalSettings()" class="tab is-grid-column" @click="selectedTab = entry.route" :class="[{'selected': selectedTab == entry.route }, 'setting-' + entry.name]"><html-fragment v-if="entry.icon" :html="$services.page.getIconHtml(entry.icon)"/>{{entry.title}}</div>
		</div>
		<n-form class="settings pages page-settings" v-if="$services.page.canEdit()" mode="component" ref="form">
			<n-prompt v-if="showing">
				<n-form class="layout2">
					<n-form-section>
						<n-form-text v-for="key in Object.keys(parameters)" v-model="parameters[key]" :label="key"/>
					</n-form-section>
					<footer class="global-actions">
						<a href="javascript:void(0)" @click="showing=false">Cancel</a>
						<button @click="doRoute">Open Page</button>
					</footer>
				</n-form>
			</n-prompt>
			<div v-if="selectedTab == 'settings'">
				<div class="divider">
					<h1>General Settings</h1>
					<p class="subscript">Configure some general settings for your application.</p>
				</div>
				
				<div class="panes">
					<div class="pane">
						<h4 class="category">Basic</h4>
						<div class="padded-content">
							<n-form-text v-model="$services.page.title" label="The website title as shown in the top bar" :timeout="600" @input="$services.page.saveConfiguration"/>
							<n-form-combo v-model="$services.page.home" label="Guest Home Page" :filter="getRoutes" @input="$services.page.saveConfiguration"/>
							<n-form-combo v-model="$services.page.homeUser" label="User Home Page" :filter="getRoutes" @input="$services.page.saveConfiguration"/>
							<n-form-text v-model="$services.page.googleSiteVerification" label="Google site verification code" :timeout="600" @input="$services.page.saveConfiguration" v-if="false"/>
							<n-form-text v-model="$services.page.geoRefusalTimeout" label="Timeout (in hours) that a geo refusal is stored" info="No timeout means we have no geo enabled" type="number" :timeout="600" @input="$services.page.saveConfiguration"/>
						</div>
					</div>
					<div class="pane">
						<h4 class="category">Branding</h4>		
						<div class="padded-content">
							<n-form-text v-model="$services.page.branding.favicon" placeholder="/resources/images/logo.png" label="The location of the favicon" :timeout="600" @input="$services.page.saveConfiguration"/>
							<n-form-text v-model="$services.page.branding.title" :placeholder="$services.page.title" label="The meta title for your application" :timeout="600" @input="$services.page.saveConfiguration"/>
							<n-form-text v-model="$services.page.branding.description" label="The meta description for your application" :timeout="600" @input="$services.page.saveConfiguration"/>
							<n-form-text v-model="$services.page.branding.image" placeholder="/resources/images/hero.png" label="The meta image for your application, minimum 1200×630 pixels, max 1mb" :timeout="600" @input="$services.page.saveConfiguration"/>
							<n-form-text v-model="$services.page.branding.imageAlt" label="Alternative text for your main image" :timeout="600" @input="$services.page.saveConfiguration"/>
							<n-form-text v-model="$services.page.branding.facebookAppId" label="Your facebook app id" info="Mostly interesting for analytics" placeholder="your_app_id" :timeout="600" @input="$services.page.saveConfiguration"/>
							<n-form-text v-model="$services.page.branding.twitterUserName" placeholder="@website-username" info="Mostly interesting for analytics" label="Your facebook app id" :timeout="600" @input="$services.page.saveConfiguration"/>
						</div>
					</div>
				</div>
				<div class="odd-block">
					<div class="divider">
						<h1>Application Properties</h1>
						<p class="subscript">You can add configuration properties to your application that you can reuse in all pages.</p>
					</div>
					<div class="panes">
						<div class="pane">
							<h4 class="category">Static</h4>	
							<div class="padded-content">
								<p class="subscript">A static property remains the same across environments.</p>
							</div>
							<div class="list-actions">
								<button @click="$services.page.properties.push({key:null,value:null})"><span class="fa fa-plus"></span>Static property</button>
							</div>
							<div class="padded-content">
								<div class="list-row" v-for="property in $services.page.properties">
									<n-form-text v-model="property.key" label="Key" :timeout="600" @input="$services.page.saveConfiguration"/>
									<n-form-text v-model="property.value" label="Value" :timeout="600" @input="$services.page.saveConfiguration"/>
									<span @click="$services.page.properties.splice($services.page.properties.indexOf(property), 1); $services.page.saveConfiguration()" class="fa fa-times"></span>
								</div>
							</div>
						</div>
						<div class="pane">
							<h4 class="category">Environment</h4>	
							<div class="padded-content">
								<p class="subscript">An environment property can be configured differently per environment.</p>
							</div>
							<div class="list-actions">
								<button @click="$services.page.environmentProperties.push({key:null,value:null})"><span class="fa fa-plus"></span>Environment property</button>
							</div>
							<div class="padded-content">
								<div class="list-row" v-for="property in $services.page.environmentProperties">
									<n-form-text v-model="property.key" label="Key" :timeout="600" @input="$services.page.saveConfiguration"/>
									<n-form-text v-model="property.value" label="Value" :timeout="600" @input="$services.page.saveConfiguration"/>
									<span @click="$services.page.environmentProperties.splice($services.page.environmentProperties.indexOf(property), 1); $services.page.saveConfiguration()" class="fa fa-times"></span>
								</div>
							</div>
						</div>
						<div class="pane">
							<h4 class="category">State</h4>	
							<div class="padded-content">
								<p class="subscript">Retrieve data from the backend that can be used by all your pages.</p>
							</div>
							<div class="list-actions">
								<button @click="$services.page.applicationState.push({name:null,operation:null})"><span class="fa fa-plus"></span>State</button>
							</div>
							<div class="padded-content">
								<div class="list-row" v-for="state in $services.page.applicationState">
									<n-form-text v-model="state.name" :required="true" label="State Name" :timeout="600" @input="$services.page.saveConfiguration"/>
									<n-form-combo v-model="state.operation" :filter="$services.page.getStateOperations" label="Operation" @input="$services.page.saveConfiguration"/>
									<span @click="$services.page.applicationState.splice($services.page.applicationState.indexOf(state), 1); $services.page.saveConfiguration()" class="fa fa-times"></span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			
			<div v-else-if="selectedTab == 'pages'" @drop="dropOnPages($event)" @dragover="dragOverPages($event)">
				<div class="divider">
					<h1>Pages</h1>
					<p class="subscript">You can add and remove pages to your application.</p>
				</div>
				<footer class="list-actions">
					<button @click="create"><span class="fa fa-plus"></span>Page</button>
					<button @click="showTemplates = true" v-if="hasTemplates"><span class="fa fa-plus"></span>Template</button>
				</footer>
				<div v-for="category in categories">
					<h4 class="category" :key="category" :ref="'category_' + category">{{category}}<button title="Copy entire category" @click="copyCategory(category)"><span class="fa fa-copy"></span></button></h4>
					<n-collapsible :title="page.content.label ? page.content.label : (page.name ? page.name : 'Unnamed Page')" v-for="page in getPagesFor(category)" class="" :key="page.id" after="Page">
						<div slot="buttons">
							<button @click="route(page)" title="Open this page"><span class="fa fa-search"></span></button>
							<button @click="copy(page)"><span class="fa fa-copy" title="Copy this page"></span></button>
							<button @click="remove(page)"><span class="fa fa-trash" title="Delete this page"></span></button>
						</div>
						<div class="panes">
							<n-form-section class="pane">
								<n-form-text :value="page.content.label ? page.content.label : page.name" label="Name" :required="true" :timeout="600" @input="function(newValue) { updatePageName(page, newValue) }" />
								<n-form-text v-model="page.content.category" label="Category" :timeout="600" @input="save(page)"/>
								<n-form-switch info="You can set this page as a default common root to all other pages that don't have any parent specified" 
									v-if="!page.content.pageParent && !page.content.path" label="Is default parent page" v-model="page.content.initial" @input="save(page)"/>
								<n-form-switch label="Is slow" v-if="!page.content.initial" v-model="page.content.slow" @input="save(page)"/>
								<n-form-text v-if="!page.content.initial" v-model="page.content.path" label="Path" :timeout="600" @input="save(page)" info="This should always start with a leading slash"/>
								<n-form-combo v-if="!page.content.initial" v-model="page.content.pageParent" label="Page Parent" :timeout="600" @input="save(page)"
									:filter="getRoutes"/>
								<n-form-text info="If this page is a parent to other pages, you can set a location where that child content should be routed in by default." v-model="page.content.defaultAnchor" label="Default Content Anchor" :timeout="600" @input="save(page)"/>
								<!-- support for pages with input values -->
							</n-form-section>
							<n-form-section class="pane">
								<h2>Metadata</h2>
								<p class="subscript">You can add custom metadata properties to your page.</p>
								<div class="list-actions">
									<button @click="page.content.properties ? page.content.properties.push({}) : $window.Vue.set(page.content, 'properties', [{}])"><span class="fa fa-plus"></span>Property</button>
								</div>
								<div v-if="page.content.properties">
									<div v-for="property in page.content.properties" class="list-row">
										<n-form-text v-model="property.key" label="Key" :timeout="600" @input="save(page)"/>
										<n-form-text v-model="property.value" label="Value":timeout="600" @input="save(page)"/>
										<span @click="page.content.properties.splice(page.content.properties.indexOf(property), 1)" class="fa fa-times"></span>
									</div>
								</div>
							</n-form-section>
						</div>
					</n-collapsible>
				</div>
				<n-sidebar v-if="showTemplates" @close="showTemplates = false" class="page-components-overview">
					<n-collapsible class="component-category" v-for="category in templateCategories" :title="$services.page.prettify(category)">
						<div class="page-template" v-for="template in getTemplateCategory(category)" :class="{'selected': selectedTemplates.indexOf(template) >= 0 }" :draggable="true" 
								@dragstart="dragTemplate($event, template)">
							<img :draggable="false" :src="'${server.root()}resources/' + template.icon" class="component-icon" v-if="template.icon"/>
							<div class="about">
								<span class="name">{{ template.name }}</span>
								<p class="template-description" v-if="template.description">{{ template.description }}</p>
							</div>
						</div>
					</n-collapsible>
				</n-sidebar>
			</div>
			
			<div v-else-if="selectedTab == 'styles'">
				<div class="divider">
					<h1>Styling</h1>
					<p class="subscript">You can add custom scss based stylesheets to your application here.</p>
				</div>
				<footer class="list-actions">
					<button @click="$services.page.createStyle"><span class="fa fa-plus"></span>Stylesheet</button>
					<div class="danger message" v-if="$services.page.cssError">{{$services.page.cssError}}</div>
				</footer>
				<n-collapsible :title="style.name" v-for="style in $services.page.styles.filter(function(x) { return x.name.substring(0, 1) != '$' })" :key="style.id">
					<div class="padded-content">
						<div class="simple-row">
							<n-form-text v-if="false" :required="true" v-model="style.name" label="Name" @input="$services.page.updateCss(style)" :timeout="600"/>
							<n-form-text type="color" v-model="lastColor[style.name]" :timeout="600" label="Color Picker"/>
							<n-form-text v-model="lastColor[style.name]" :timeout="600" label="Color Code"/>
						</div>
					</div>
					<n-ace v-model="style.content" :timeout="1000" @input="$services.page.saveStyle(style)" :ref="'editors_' + style.name"/>
				</n-collapsible>
			</div>
			
			<div v-else-if="selectedTab == 'functions'">
				<div>
					<div class="divider">
						<h1>Functions</h1>
						<p class="subscript">Add javascript-based functions that can be used throughout your application.</p>
					</div>
					<div class="panes">
						<div class="pane">
							<footer class="list-actions">
								<button @click="$services.page.createFunction"><span class="fa fa-plus"></span>Function</button>
							</footer>
							<n-collapsible :title="transformer.id" v-for="transformer in $services.page.functions">
								<n-collapsible title="Input">
									<div class="list-actions">
										<button @click="addFunctionParameter(transformer, 'inputs')"><span class="fa fa-plus"></span>Input Parameter</button>
									</div>
									<div class="padded-content">
										<div class="list-row" v-for="parameter in transformer.inputs" :title="parameter.name">
											<n-form-text v-model="parameter.name" :required="true" label="Name"/>
											<n-form-combo v-model="parameter.type" label="Type" :nillable="false" :filter="$services.page.getAvailableTypes"/>
											<n-form-combo v-model="parameter.format" label="Format" v-if="parameter.type == 'string'" :items="['date-time', 'uuid', 'uri', 'date', 'password']"/>
											<n-form-text v-model="parameter.default" label="Default Value"/>
											<span @click="transformer.inputs.splice(transformer.inputs.indexOf(parameter), 1)" class="fa fa-times"></span>
										</div>
									</div>
								</n-collapsible>
								<n-collapsible title="Output" class="page-cell layout2 list-item io" v-if="!transformer.async">
									<div class="list-actions">
										<button @click="addFunctionParameter(transformer, 'outputs')"><span class="fa fa-plus"></span>Output Parameter</button>
									</div>
									<div class="padded-content">
										<div class="list-row" v-for="parameter in transformer.outputs" :title="parameter.name">
											<n-form-text v-model="parameter.name" :required="true" label="Name"/>
											<n-form-combo v-model="parameter.type" label="Type" :nillable="false" :filter="$services.page.getAvailableTypes"/>
											<n-form-combo v-model="parameter.format" label="Format" v-if="parameter.type == 'string'" :items="['date-time', 'uuid', 'uri', 'date', 'password']"/>
											<n-form-text v-model="parameter.default" label="Default Value"/>
											<div class="list-item-actions">
												<span class="fa fa-times" @click="transformer.outputs.splice(transformer.outputs.indexOf(parameter), 1)"></span>
											</div>
										</div>
									</div>
								</n-collapsible>
								<div class="list-actions">
									<button @click="$services.page.saveFunction(transformer)"><span class="fa fa-save"></span>Save Function</button>
								</div>
								<div class="padded-content">
									<n-form-switch v-model="transformer.async" label="Asynchronous"/>
								</div>
								<n-ace v-model="transformer.content" :ref="'editors_' + transformer.id"/>
							</n-collapsible>
						</div>
					</div>
				</div>
				<div class="odd-block">
					<div class="panes">
						<div class="pane">
							<h4 class="category">Devices</h4>
							<p class="subscript category-subscript">You can define a device based on the width (in pixels). You can use these devices to conditionally render content both in page builder and in scss.</p>
							<div class="padded-content">
								<div class="list-actions">
									<button @click="$services.page.devices.push({name:null,width:0})"><span class="fa fa-plus"></span>Device</button>
								</div>
								<div class="padded-content">
									<div class="list-row">
										<n-form-text :value="'phone'" :required="true" label="Device Name" :disabled="true"/>
										<n-form-text v-model="getDevice('phone').width" type="number" label="Width" :timeout="600" @input="$services.page.saveConfiguration" placeholder="512"/>
									</div>
									<div class="list-row">
										<n-form-text :value="'tablet'" :required="true" label="Device Name" :disabled="true"/>
										<n-form-text v-model="getDevice('tablet').width" type="number" label="Width" :timeout="600" @input="$services.page.saveConfiguration" placeholder="960"/>
									</div>
									<div class="list-row">
										<n-form-text :value="'desktop'" :required="true" label="Device Name" :disabled="true"/>
										<n-form-text v-model="getDevice('desktop').width" type="number" label="Width" :timeout="600" @input="$services.page.saveConfiguration" placeholder="1280"/>
									</div>
									<div class="list-row" v-for="device in $services.page.devices.filter(function(x) { return x.name != 'phone' && x.name != 'tablet' && x.name != 'desktop' })">
										<n-form-text v-model="device.name" :required="true" label="Device Name" :timeout="600" @input="$services.page.saveConfiguration"/>
										<n-form-text v-model="device.width" type="number" label="Width" :timeout="600" @input="$services.page.saveConfiguration"/>
										<span @click="$services.page.devices.splice($services.page.devices.indexOf(device), 1); $services.page.saveConfiguration()" class="fa fa-times"></span>
									</div>
								</div>
							</div>
						</div>
						<div class="pane">
							<h4 class="category">Imports</h4>
							<p class="subscript category-subscript">Import scripts from external providers like google maps. If you made an application variable called for example 'myApiKey', you can use it in your import url with this syntax: <code v-pre>https://example.com?apikey={{ application.myApiKey }}</code></p>
							<div class="padded-content">
								<div class="list-actions">
									<button @click="$services.page.imports.push({link:null, type: 'javascript', async: true})"><span class="fa fa-plus"></span>Import</button>
								</div>
								<div class="padded-content">
									<div class="list-row" v-for="single in $services.page.imports">
										<n-form-text v-model="single.link" :required="true" label="Link" :timeout="600" @input="$services.page.saveConfiguration"/>
										<n-form-combo v-if="false" v-model="single.type" :items="['javascript', 'css']" label="Type" :timeout="600" @input="$services.page.saveConfiguration"/>
										<n-form-switch v-model="single.async" label="Asynchronous" :timeout="600" @input="$services.page.saveConfiguration"/>
										<span @click="$services.page.imports.splice($services.page.imports.indexOf(single), 1); $services.page.saveConfiguration()" class="fa fa-times"></span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			
			<div v-else v-route-render="{alias: selectedTab}"></div>
		</n-form>
		<div v-else>%{You don't have permission to view this page, you might want to try to <a v-route:login>log in</a> as a user with sufficient privileges}</div>
	</div>
</template>

<template id="nabu-create-page">
	<n-form class="nabu-create-page layout2" ref="form">
		<n-form-section>
			<n-form-switch label="Create a new category" v-model="newCategory" v-if="hasAnyCategories"/>
			<n-form-combo v-if="!newCategory" v-model="category" label="Existing Category" :required="true" :filter="checkCategory"/>
			<n-form-text v-else v-model="category" label="New Category" :required="true"/>
			<n-form-text v-model="name" label="Name" :required="true" :validator="validator"/>
		</n-form-section>
		<footer>
			<a href="javascript:void(0)" @click="$reject">Cancel</a>
			<button @click="$resolve({category:category, name:name})">Add</button>
		</footer>
	</n-form>
</template>

<template id="nabu-pages-paste">
	<n-form class="nabu-pages-paste layout2" ref="form">
		<n-form-section>
			<n-form-text v-model="category" label="Paste in category" :required="true"/>
			<n-form-text v-model="name" label="Paste with name" :required="true"/>
		</n-form-section>
		<footer>
			<a href="javascript:void(0)" @click="$reject">Cancel</a>
			<button @click="$resolve({category:category, name:name})">Add</button>
		</footer>
	</n-form>
</template>