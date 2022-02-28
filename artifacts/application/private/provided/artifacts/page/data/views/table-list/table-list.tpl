<template id="data-table-list-configure">
	<data-common-configure :page="page" :parameters="parameters" :cell="cell"
			:edit="edit"
			:records="records"
			:selected="selected"
			:inactive="inactive"
			@updatedEvents="$emit('updatedEvents')"
			@close="$emit('close'); configuring=false"
			:multiselect="true"
			:configuring="true"
			:updatable="true"
			:paging="paging"
			:filters="filters"
			:supports-detail-fields="true"
			@refresh="refresh">
		<div slot="main-settings">
			<n-form-switch v-model="cell.state.useNativeTable" label="Use HTML Table" info="By default flex tables are used, but in some cases a native HTML table is more appropriate"/>
			<n-form-switch v-if="cell.state.useNativeTable" v-model="cell.state.useTopHeader" label="Use top header"/>
			<n-form-switch v-model="cell.state.hideEmptyColumns" label="Hide empty columns"/>
			<n-form-switch v-model="cell.state.onlyOneDetailOpen" label="Have only one detail open" v-if="cell.state.detailFields && cell.state.detailFields.length" />
		</div>
		<div slot="settings">
			<n-collapsible class="padded" title="Field widths" v-if="!cell.state.useNativeTable && cell.state.fields && cell.state.fields.length">
				<n-form-text :label="'Width for: ' + (field.label ? field.label : field.key)" :value="field.width" v-for="field in cell.state.fields" @input="function(newValue) { $window.Vue.set(field, 'width', newValue) }"/>
			</n-collapsible>
			<n-collapsible class="page-fields list" title="Top header" v-if="cell.state.useTopHeader && cell.state.fields && cell.state.fields.length">
				<div class="list-actions">
					<button @click="addTopHeaderField()"><span class="fa fa-plus"></span>Field</button>
				</div>
				<div v-if="cell.state.topHeaders">
					<n-collapsible class="list-item" :title="field.label ? field.label : 'Unlabeled'" v-for="field in cell.state.topHeaders">
						<n-form-text v-model="field.label" label="Field Label"/>
						<div>
							<div class="list-item-actions">
								<button @click="addSubheader(field)">Add Subheader</button>
								<button  @click="cell.state.topHeaders.splice(cell.state.topHeaders.indexOf(field), 1)">Remove Field</button>
								<button @click="fieldBeginning(field)"><span class="fa fa-chevron-circle-left"></span></button>
								<button @click="fieldUp(field)"><span class="fa fa-chevron-circle-up"></span></button>
								<button @click="fieldDown(field)"><span class="fa fa-chevron-circle-down"></span></button>
								<button @click="fieldEnd(field)"><span class="fa fa-chevron-circle-right"></span></button>
							</div>
						</div>
						<n-form-section class="list-row" v-for="i in Object.keys(field.subheaders)">
							<n-form-combo v-model="field.subheaders[i]" :items="eventFields"
								:formatter="function(x) { return x.index + (x.label ? ' - ' + x.label : '') }"
								:extracter="function(x) { return x.index }"
								label="Subheader"/>
							<span class="fa fa-times" @click="field.subheaders.splice(i, 1)"></span>
						</n-form-section>
						<div class="list-item-actions">
							<button @click="addStyle(field)"><span class="fa fa-plus"></span>Style</button>
						</div>
						<n-form-section class="list-row" v-for="style in field.styles">
							<n-form-text v-model="style.class" label="Class"/>
							<n-form-text v-model="style.condition" label="Condition"/>
							<span class="fa fa-times" @click="field.styles.splice(field.styles.indexOf(style), 1)"></span>
						</n-form-section>
					</n-collapsible>
				</div>
			</n-collapsible>
			<n-collapsible title="Row Grouping" v-if="cell.state.useNativeTable">
				<div class="list-actions">
					<button @click="addGroupingField()"><span class="fa fa-plus"></span>Field</button>
				</div>
				<div v-if="cell.state.rowGroups" class="padded-content">
					<div v-for="field in cell.state.rowGroups" class="list-row">
						<n-form-combo v-model="field.fieldIndex" :items="eventFields"
							:formatter="function(x) { return x.index + (x.label ? ' - ' + x.label : '') }"
							:extracter="function(x) { return x.index }"
							label="Group column"/>
						<n-form-combo v-model="field.fieldName" :items="keys"
							label="Group by field"/>
						<n-form-switch v-model="field.subGroup" label="Is a subgroup of previous?" v-if="cell.state.rowGroups.indexOf(field) > 0"/>
						<span @click="cell.state.rowGroups.splice(cell.state.rowGroups.indexOf(field), 1)" class="fa fa-times"></span>
					</div>
				</div>
			</n-collapsible>
			<n-collapsible title="Batch Selection" v-if="cell.state.useNativeTable">
				<div class="padded-content">
					<n-form-combo v-model="cell.state.batchSelectionColumn" :items="eventFields"
						:formatter="function(x) { return x.index + (x.label ? ' - ' + x.label : '') }"
						:extracter="function(x) { return x.index }"
						label="Batch selection column"
						@input="updateMultiSelect"/>
					<n-form-text v-if="cell.state.batchSelectionColumn != null" v-model="cell.state.batchSelectionEvent" label="Event to emit with the full batch of selected elements" :timeout="600"/>
					<n-form-switch v-if="cell.state.batchSelectionEvent" v-model="cell.state.batchSelectionEventLoad" label="Load the current event as initial selection"/>
					<n-form-text v-if="cell.state.batchSelectionColumn != null" v-model="cell.state.batchSelectionCondition" label="Show if" info="If left empty, the checkbox will always show" :timeout="600"/>
					<n-form-switch v-if="cell.state.batchSelectionColumn != null && !cell.state.batchSelectionAmount" v-model="cell.state.batchSelectAll" label="Whether or not you want to add a 'select all' to the header"/>
					<n-form-text v-if="!cell.state.batchSelectAll" v-model="cell.state.batchSelectionAmount" label="Maximum amount of selected" :timeout="600"/>
				</div>
			</n-collapsible>
			<n-collapsible title="Device Layout" v-if="cell.state.fields && cell.state.fields.length && $services.page.devices.length">
				<n-collapsible v-for="field in cell.state.fields" :title="field.label ? field.label : 'Unlabeled'" class="light">
					<div class="padded-content">
						<div class="list-actions">
							<button @click="addDevice(field)"><span class="fa fa-plus"></span>Device rule</button>
						</div>
						<div v-if="field.devices">
							<div class="list-row" v-for="device in field.devices">
								<n-form-combo v-model="device.operator" :items="['>', '>=', '<', '<=', '==']"/>
								<n-form-combo v-model="device.name" 
									:filter="$services.page.suggestDevices"/>
								<span @click="cell.devices.splice(cell.devices.indexOf(device), 1)" class="fa fa-times"></span>
							</div>
						</div>
					</div>
				</n-collapsible>
			</n-collapsible>
			<n-collapsible title="Field Sorting" v-if="cell.state.fields && cell.state.fields.length">
				<div class="list-row" v-for="field in cell.state.fields">
					<n-form-combo v-model="field.orderField" :items="simpleKeys"
						:label="field.label ? field.label : 'Unlabeled'"
						@input="function(value) { field.orderField = value ? value : null }"/>
				</div>
			</n-collapsible>
		</div>
	</data-common-configure>
</template>
<template id="data-table-list">
	<data-common-content :data="$self" class="data-cell data-table-list">
		<ul class="table-list classic data" cellspacing="0" cellpadding="0" :class="dataClass" v-if="!cell.state.useNativeTable && (edit || showEmpty || records.length)">
			<li class="row title">
				<span @click="sort(getSortKey(field))" v-for="field in cell.state.fields" :style="{'flex-grow': (field.width != null ? field.width : '1')}"
						v-if="!(isAllFieldHidden(field) && cell.state.hideEmptyColumns)">
					<span>{{ $services.page.translate(field.label) }}</span>
					<n-info class="n-form-label-info" v-if="field.info" :icon="field.infoIcon"><span v-html="$services.page.translate(field.info)"></span></n-info>
					<span class="fa fa-sort-up" v-if="field.label && orderBy.indexOf(getSortKey(field)) >= 0"></span>
					<span class="fa fa-sort-down" v-if="field.label && orderBy.indexOf(getSortKey(field) + ' desc') >= 0"></span>
				</span>
				<span v-if="actions.length" class="actions"></span>
			</li>
			<li v-visible="lazyLoad.bind($self, record)" class="row" v-for="record in records" @click="select(record)" :class="getRecordStyles(record)" :custom-style="cell.state.styles.length > 0" :key="record.id ? record.id : records.indexOf(record)">
				<page-field :field="field" :data="record" 
					v-if="!(isFieldHidden(field, record))"
					:should-style="false" 
					:label="false"
					:style="{'flex-grow': (field.width != null ? field.width : '1')}"
					@updated="update(record)"
					:page="page"
					:class="$services.page.getDynamicClasses(field.styles, {record:record}, $self)" 
					v-for="field in cell.state.fields"
					:cell="cell"
					@mouseover="actionHovering = fieldActions(field).length > 0" @mouseout="actionHovering = false"
					:actions="fieldActions(field)"/>
				<div class="actions" v-if="recordActions.length" @mouseover="actionHovering = true" @mouseout="actionHovering = false">
					<button v-if="!action.condition || $services.page.isCondition(action.condition, {record:record}, $self)" 
						class="p-button"
						v-for="action in recordActions" 
						@click="trigger(action, record)"
						:class="[action.class, {'has-icon': action.icon && action.label }, {'inline': !action.class }]"><span class="fa" v-if="action.icon" :class="action.icon"></span><label v-if="action.label">{{$services.page.translate(action.label)}}</label></button>
				</div>
			</li>
		</ul>
		
		<table class="classic data" cellspacing="0" cellpadding="0" :class="[dataClass, {'selectable': selectable}]" v-else-if="cell.state.useNativeTable && (edit || showEmpty || records.length)">
			<thead>
				<tr v-if="cell.state.useTopHeader && cell.state.topHeaders && cell.state.topHeaders.length" class="top-header">
					<th v-if="cell.state.detailFields && cell.state.detailFields.length > 0"></th>
					<th v-for="field in cell.state.topHeaders" v-if="!(subheadersHidden(field) && cell.state.hideEmptyColumns)" :colspan="calculateColspan(field)"><span>{{ $services.page.translate(field.label) }}</span>
					</th>
					<th v-if="actions.length"></th>
				</tr>
				<tr>
					<th v-if="cell.state.detailFields && cell.state.detailFields.length > 0"></th>
					<th @click="sort(getSortKey(field))"
							v-for="field in cell.state.fields"
							v-if="!(isAllFieldHidden(field) && cell.state.hideEmptyColumns) && isAllowedDevice(field)">
						<n-form-checkbox v-if="cell.state.batchSelectAll && cell.state.batchSelectionColumn != null && cell.state.fields.indexOf(field) == cell.state.batchSelectionColumn && isShowAnyBatchSelection()" 
							:value="allSelected" @input="selectAll"/>
						<span>{{ $services.page.translate(field.label) }}</span>
						<n-info class="n-form-label-info" v-if="field.info" :icon="field.infoIcon"><span>{{ $services.page.translate(field.info) }}</span></n-info>
						<span class="fa fa-sort-up" v-if="field.label && orderBy.indexOf(getSortKey(field)) >= 0"></span>
						<span class="fa fa-sort-down" v-if="field.label && orderBy.indexOf(getSortKey(field) + ' desc') >= 0"></span>
					</th>
					<th v-if="actions.length"></th>
				</tr>
			</thead>
			<tbody>
				<template v-for="(record, recordIndex) in records">
					<tr v-visible="lazyLoad.bind($self, record)" @click="cell.state.batchSelectionColumn == null ? select(record) : function() {}" :class="getRecordStyles(record)" :custom-style="cell.state.styles.length > 0" :key="record.id ? record.id : records.indexOf(record)">
						<td v-if="cell.state.detailFields && cell.state.detailFields.length > 0"><span class="fa" :class="{'fa-chevron-down' : isOpen(record), 'fa-chevron-right': !isOpen(record)}" @click="toggleOpen(record)"></span></td>
						<td :class="$services.page.getDynamicClasses(field.styles, {record:record}, $self)" v-for="field in cell.state.fields" v-if="!(isAllFieldHidden(field) && cell.state.hideEmptyColumns) && isAllowedDevice(field) && calculateRowspan(field, record) >= 0" :rowspan="calculateRowspan(field, record)">
							<n-form-checkbox v-if="cell.state.batchSelectionColumn != null && cell.state.fields.indexOf(field) == cell.state.batchSelectionColumn && isShowBatchSelection(record)" 
								:value="selected" :item="record" @add="selectBatch" @remove="unselectBatch"/>
							<page-field :field="field" :data="record" 
								v-if="!isFieldHidden(field, record)"
								:should-style="false" 
								:label="false"
								@updated="update(record)"
								@mouseover="actionHovering = fieldActions(field).length > 0" @mouseout="actionHovering = false"
								:actions="fieldActions(field)"
								:page="page"
								:cell="cell"/>
						</td>
						<td class="actions" v-if="actions.length" @mouseover="actionHovering = true" @mouseout="actionHovering = false">
							<button v-if="!action.condition || $services.page.isCondition(action.condition, {record:record}, $self)" 
								v-for="action in recordActions" 
								class="p-button"
								@click="trigger(action, record, cell.state.batchSelectionColumn != null && actionHovering)"
								:class="[action.class, {'has-icon': action.icon && action.label }, {'inline': !action.class }]"><span class="fa" v-if="action.icon" :class="action.icon"></span><label v-if="action.label">{{$services.page.translate(action.label)}}</label></button>
						</td>
					</tr>
					<tr v-if="cell.state.detailFields && cell.state.detailFields.length > 0 && isOpen(record)" class="data-detail">
						<td></td>
						<td v-for="(field, index) in cell.state.detailFields" :colspan="index == cell.state.detailFields.length - 1 ? (cell.state.fields.length - cell.state.detailFields.length) + 1 + (actions.length ? 1 : 0) : 1">
							<page-field :field="field" :data="record" 
								v-if="!isFieldHidden(field, record)"
								:should-style="false" 
								:label="false"
								:page="page"
								:cell="cell"/>
						</td>	
					</tr>
				</template>
			</tbody>
		</table>
		<n-paging :value="paging.current" :total="paging.total" :load="load" :initialize="false" v-if="!cell.state.loadLazy && !cell.state.loadMore"/>
		<div class="load-more" v-else-if="cell.state.loadMore && paging.current != null && paging.total != null && paging.current < paging.total - 1">
			<button class="p-button load-more-button" @click="load(paging.current + 1, true)">%{Load More}</button>
		</div>
		<div v-if="!records.length && !showEmpty && cell.state.fields && cell.state.fields.length" class="no-data">{{ cell.state.emptyPlaceholder ? $services.page.translate(cell.state.emptyPlaceholder) : "%{No data available}"}}<span v-if="$services.page.wantEdit && cell.state.fields && cell.state.fields.length" class="fa fa-table generate-stub" @click="generateStub" title="Generate Stub Data"></span></div>
	</data-common-content>
</template>

