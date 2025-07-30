<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Or
          <NuxtLink to="/auth/login" class="font-medium text-blue-600 hover:text-blue-500">
            sign in to your existing account
          </NuxtLink>
        </p>
      </div>
      
      <UCard class="p-8">
        <UForm :schema="schema" :state="state" @submit="onSubmit" class="space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="First Name" name="firstName">
              <UInput v-model="state.firstName" placeholder="John" />
            </UFormGroup>
            
            <UFormGroup label="Last Name" name="lastName">
              <UInput v-model="state.lastName" placeholder="Doe" />
            </UFormGroup>
          </div>
          
          <UFormGroup label="Email address" name="email" required>
            <UInput v-model="state.email" type="email" placeholder="john@example.com" />
          </UFormGroup>
          
          <UFormGroup label="Password" name="password" required>
            <UInput v-model="state.password" type="password" placeholder="••••••••" />
          </UFormGroup>
          
          <UFormGroup label="Confirm Password" name="confirmPassword" required>
            <UInput v-model="state.confirmPassword" type="password" placeholder="••••••••" />
          </UFormGroup>
          
          <div>
            <UButton 
              type="submit" 
              :loading="loading" 
              class="w-full"
              size="lg"
            >
              Create Account
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
      
      <UAlert 
        v-if="success" 
        color="green" 
        variant="soft" 
        :title="success"
      />
    </div>
  </div>
</template>

<script setup>
import { z } from 'zod'

useHead({
  title: 'Register - Vahan Email Platform'
})

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

const state = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const loading = ref(false)
const error = ref('')
const success = ref('')

const onSubmit = async (event) => {
  loading.value = true
  error.value = ''
  success.value = ''
  
  try {
    const { data } = await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        email: event.data.email,
        password: event.data.password,
        firstName: event.data.firstName,
        lastName: event.data.lastName
      }
    })
    
    success.value = 'Account created successfully! Please check your email to verify your account.'
    
    // Redirect to dashboard after a short delay
    setTimeout(() => {
      navigateTo('/dashboard')
    }, 2000)
    
  } catch (err) {
    error.value = err.data?.message || 'Failed to create account'
  } finally {
    loading.value = false
  }
}
</script>
