#include <stdio.h>
#include <stdlib.h>

struct No {
    int valor;
    struct No *proximo;
};

struct No *novo_no(int valor) {
    struct No *no = malloc(sizeof(struct No));
    no->valor = valor;
    no->proximo = NULL;
    return no;
}

int main(void) {
    // Coloque um breakpoint na linha abaixo e use F10 (step over).
    struct No *inicio = novo_no(10);
    inicio->proximo = novo_no(20);
    inicio->proximo->proximo = novo_no(30);

    struct No *atual = inicio;
    int soma = 0;
    while (atual != NULL) {
        soma = soma + atual->valor;
        atual = atual->proximo;
    }
    printf("Soma: %d\n", soma);
    return 0;
}
