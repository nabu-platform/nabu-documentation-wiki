<template id="nabu-console">
	<div class="nabu-console">
		<div class="tabs">
			<button class="tab" @click="tab = 'events'" :class="{'active': tab == 'events'}">Events</button
			><button class="tab" @click="tab = 'features'" :class="{'active': tab == 'features'}">Features</button
			><button class="tab" @click="tab = 'inspect'" :class="{'active': tab == 'inspect'}">Inspect</button>
		</div>
		<div v-if="tab == 'events'" class="tab-content">
			<div class="menu">
				<n-form-text type="text" placeholder="Search" v-model="search" :timeout="400"/>
				<button v-if="false" @click="$services.page.reports.splice(0)">Clear</button>
			</div>
			<div class="content">
				<div class="nabu-console-report nabu-console-report-title">
					<div class="timestamp">Timestamp</div>
					<div class="source">Source</div>
					<div class="type">Type</div>
					<div class="content">Content</div>
				</div>
				<div class="nabu-console-reports">
					<div class="nabu-console-report" v-for="report in $services.page.reports" :class="[{'selected': selected == report, 'hidden': isHidden(report) }, report.category]">
						<div class="timestamp"><span class="icon" @click="selected = selected == report ? null : report"><span v-if="selected == report">-</span><span v-else>+</span></span>{{$services.formatter.date(report.timestamp, 'MMM dd, HH:mm:ss')}}</div>
						<div class="source">{{report.source}}<span v-if="report.category" class="category">{{report.category}}</span></div>
						<div class="type"><span v-if="report.type">{{report.type }}</span><span class="name" v-if="report.name">{{report.name}}</span></div>
						<div class="content" @click="selected = report">{{report.properties ? JSON.stringify(report.properties, null, 2) : null }}</div>
					</div>
				</div>
			</div>
		</div>
		<div v-else-if="tab == 'features'" class="tab-content">
			<div class="menu">
				<button @click="resetFeatures">Reset</button>
			</div>
			<div class="content">
				<h3>Enabled Features</h3>
				<div class="feature-list">
					<n-form-switch :value="true" @input="disableFeature(feature)" v-for="feature in enabledFeatures" :label="feature.description ? feature.description : feature.name"/>
				</div>
				<h3>Disabled Features</h3>
				<div class="feature-list">
					<n-form-switch @input="enableFeature(feature)" v-for="feature in disabledFeatures" :label="feature.description ? feature.description : feature.name"/>
				</div>
			</div>
		</div>
		<div v-else-if="tab == 'inspect'" class="tab-content inspect">
			<div class="content" v-content="cleanedUpContent"></div>
		</div>
	</div>
</template>