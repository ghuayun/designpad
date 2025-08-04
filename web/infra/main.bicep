// Main Bicep template for DesignDraw web application deployment
// This template creates all necessary Azure resources for a production-ready deployment

@description('The name of the environment (dev, staging, prod)')
param environmentName string = 'dev'

@description('The primary location for all resources')
param location string = resourceGroup().location

@description('The name of the application')
param appName string = 'designdraw'

@description('The Docker image to deploy')
param containerImage string = ''

// Generate unique resource names
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = {
  'azd-env-name': environmentName
  'app-name': appName
  'deployed-by': 'azure-bicep'
}

// Container Registry
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: 'acr${resourceToken}'
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
    networkRuleSet: {
      defaultAction: 'Allow'
    }
    publicNetworkAccess: 'Enabled'
  }
}

// Container Apps Environment
resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: 'cae-${appName}-${resourceToken}'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspace.properties.customerId
        sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
      }
    }
  }
}

// Log Analytics Workspace for monitoring
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-${appName}-${resourceToken}'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// User-assigned Managed Identity for Container App
resource userAssignedManagedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-${appName}-${resourceToken}'
  location: location
  tags: tags
}

// Role assignment for Container App to pull from ACR
resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerRegistry.id, userAssignedManagedIdentity.id, 'acrpull')
  scope: containerRegistry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d') // AcrPull role
    principalId: userAssignedManagedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Container App
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'ca-${appName}-${resourceToken}'
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedManagedIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
          allowedHeaders: ['*']
          allowCredentials: false
        }
      }
      registries: [
        {
          identity: userAssignedManagedIdentity.id
          server: containerRegistry.properties.loginServer
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'designdraw-web'
          image: !empty(containerImage) ? containerImage : '${containerRegistry.properties.loginServer}/designdraw-web:latest'
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: '3000'
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          probes: [
            {
              type: 'Readiness'
              httpGet: {
                path: '/health'
                port: 3000
              }
              initialDelaySeconds: 10
              periodSeconds: 30
            }
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 3000
              }
              initialDelaySeconds: 30
              periodSeconds: 60
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
  dependsOn: [
    acrPullRoleAssignment
  ]
}

// Outputs for reference
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.properties.loginServer
output AZURE_CONTAINER_REGISTRY_NAME string = containerRegistry.name
output AZURE_CONTAINER_APPS_ENVIRONMENT_NAME string = containerAppsEnvironment.name
output AZURE_CONTAINER_APP_NAME string = containerApp.name
output AZURE_CONTAINER_APP_URL string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output AZURE_LOG_ANALYTICS_WORKSPACE_NAME string = logAnalyticsWorkspace.name
