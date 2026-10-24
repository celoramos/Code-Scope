#include <iostream>
#include <map>
#include <stack>
#include <string>
#include <vector>

int main() {
    // Coloque um breakpoint na linha abaixo e use F10 (step over).
    std::vector<int> notas;
    notas.push_back(7);
    notas.push_back(9);
    notas.push_back(6);
    std::map<std::string, int> contagem;
    contagem["sol"] = 1;
    contagem["mar"] = 1;
    contagem["sol"] = 2;
    std::stack<int> pilha;
    pilha.push(1);
    pilha.push(2);
    pilha.pop();
    std::cout << notas.size() << " " << contagem.size() << " " << pilha.size() << std::endl;
    return 0;
}
