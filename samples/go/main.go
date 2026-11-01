package main

import "fmt"

// No é um nó de lista ligada.
type No struct {
	valor   int
	proximo *No
}

type Aluno struct {
	nome string
	nota float64
}

func fatorial(n int) int {
	if n <= 1 {
		return 1
	}
	return n * fatorial(n-1)
}

func main() {
	// Coloque um breakpoint na linha abaixo e use F10 (step over).
	numeros := [5]int{5, 1, 4, 2, 8}
	for i := 0; i < len(numeros)-1; i++ {
		for j := 0; j < len(numeros)-1-i; j++ {
			if numeros[j] > numeros[j+1] {
				numeros[j], numeros[j+1] = numeros[j+1], numeros[j]
			}
		}
	}

	pratos := []string{}
	pratos = append(pratos, "azul")
	pratos = append(pratos, "verde")
	pratos = pratos[:len(pratos)-1]

	grade := [][]int{{1, 2, 3}, {4, 5, 6}}
	grade[1][2] = 60

	contagem := map[string]int{}
	contagem["sol"]++
	contagem["lua"]++
	contagem["sol"]++

	inicio := &No{valor: 1}
	inicio.proximo = &No{valor: 2}
	atual := inicio
	atual = atual.proximo

	turma := []Aluno{{"Ana", 9.5}, {"Bia", 8}}
	melhor := &turma[0]

	var nada *No
	aprovado := melhor.nota > 7
	letra := 'x'
	texto := "go"
	fmt.Println(fatorial(3), numeros, pratos, grade, contagem, atual.valor, nada == nil, aprovado, letra, texto)
}
