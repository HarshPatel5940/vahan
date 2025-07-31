<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Or
          <NuxtLink to="/auth/register" class="font-medium text-blue-600 hover:text-blue-500">
            create a new account
          </NuxtLink>
        </p>
      </div>
      
      <UCard class="p-8">
        <UForm :schema="schema" :state="state" @submit="onSubmit" class="space-y-6">
          <UFormGroup label="Email address" name="email" required>
            <UInput v-model="state.email" type="email" placeholder="john@example.com" />
          </UFormGroup>
          
          <UFormGroup label="Password" name="password" required>
            <UInput v-model="state.password" type="password" placeholder="••••••••" />
          </UFormGroup>
          
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <UCheckbox v-model="state.remember" label="Remember me" />
            </div>
            
            <div class="text-sm">
              <NuxtLink to="/auth/forgot-password" class="font-medium text-blue-600 hover:text-blue-500">
                Forgot your password?
              </NuxtLink>
            </div>
          </div>
          
          <div>
            <UButton 
              type="submit" 
              :loading="loading" 
              class="w-full"
              size="lg"
            >
              Sign In
            </UButton>
          </div>
        </UForm>
      </UCard>
      
      <UAlert 
        v-if="error" 
        color="red" 
        variant="soft" 
        :title="error"
        :close-button="{ icon: 'i-heroicons-x-mark-20-solid', color: 'gray', variant: 'link', padded: false }"
        @close="error = ''"
      />
    </div>
  </div>
</template>

<script setup>
import { z } from 'zod'

useHead({
  title: 'Sign In - Vahan Email Platform'
})

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional()
})

const state = reactive({
  email: '',
  password: '',
  remember: false
})

const loading = ref(false)
const error = ref('')

const onSubmit = async (event) => {
  loading.value = true
  error.value = ''
  
  try {
    const { data } = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: event.data.email,
        password: event.data.password
      }
    })
    
    // Redirect to dashboard on successful login
    await navigateTo('/dashboard')
    
  } catch (err) {
    error.value = err.data?.message || 'Failed to sign in'
  } finally {
    loading.value = false
  }
}
</script>
