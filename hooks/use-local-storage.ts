"use client"

import { useState, useEffect } from "react"

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Estado para armazenar o valor
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  // Flag para controlar se já inicializamos o valor do localStorage
  const [initialized, setInitialized] = useState(false)

  // Inicializar o estado com o valor do localStorage (se existir)
  useEffect(() => {
    // Evitar múltiplas inicializações
    if (initialized) return

    try {
      // Verificar se estamos no navegador
      if (typeof window !== "undefined") {
        const item = window.localStorage.getItem(key)
        // Analisar o item armazenado ou retornar o valor inicial
        if (item) {
          setStoredValue(JSON.parse(item))
        }
        setInitialized(true)
      }
    } catch (error) {
      console.log(error)
      setInitialized(true)
    }
  }, [key, initialValue, initialized])

  // Função para atualizar o valor no localStorage e no estado
  const setValue = (value: T) => {
    try {
      // Permitir que o valor seja uma função para seguir o mesmo padrão do useState
      const valueToStore = value instanceof Function ? value(storedValue) : value

      // Salvar no estado
      setStoredValue(valueToStore)

      // Salvar no localStorage
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.log(error)
    }
  }

  return [storedValue, setValue]
}
