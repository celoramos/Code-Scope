package main

import (
	"fmt"
	"sync"
)

type No struct {
	Valor int
	Prox  *No
}

type Forma interface{ Area() int }
type Quadrado struct{ L int }

func (q Quadrado) Area() int { return q.L * q.L }

func main() {
	grande := make([]int, 1000000)
	arr := [5]int{1, 2, 3, 4, 5}
	matriz := make([][]int, 100)
	for i := range matriz {
		matriz[i] = make([]int, 100)
	}
	var nilSlice []int
	var nilMapa map[string]int
	var nilPtr *No
	mapa := map[string][]int{"k": {1}}
	chaves := map[No]int{{Valor: 1}: 1}
	var cabeca *No
	for i := 0; i < 5000; i++ {
		cabeca = &No{i, cabeca}
	}
	ciclo := &No{Valor: 1}
	ciclo.Prox = ciclo
	var forma Forma = Quadrado{2}
	var vazio interface{}
	misto := []interface{}{1, "dois", 3.5, nil, []int{4}}
	canal := make(chan int, 2)
	canal <- 1
	texto := "aç😀\n"
	bytes := []byte(texto)
	runas := []rune(texto)
	funcao := func(x int) int { return x * 2 }
	var mu sync.Mutex
	var wg sync.WaitGroup
	wg.Add(1)
	go func() { defer wg.Done(); mu.Lock(); arr[1] = 9; mu.Unlock() }()
	wg.Wait()
	grande[0] = 7 // PARE
	matriz[1][1] = 99
	mapa["k"] = append(mapa["k"], 2)
	cabeca.Valor = -1
	arr[0] = funcao(21)
	fmt.Println(grande[0], arr, nilSlice, nilMapa, nilPtr, chaves, ciclo.Valor, forma.Area(), vazio, misto, <-canal, bytes, runas)
}
