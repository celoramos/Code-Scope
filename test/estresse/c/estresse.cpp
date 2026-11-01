#include <map>
#include <set>
#include <stack>
#include <queue>
#include <string>
#include <vector>
#include <memory>
#include <iostream>

struct Ponto { int x; int y; };
class Forma { public: virtual int area() { return 1; } virtual ~Forma() {} };
class Quadrado : public Forma { public: int l = 2; int area() override { return l * l; } };
template <typename T> struct Caixa { T v; };

int main() {
    std::vector<int> grande(100000, 1);
    std::vector<std::vector<int>> matriz(50, std::vector<int>(50, 0));
    std::vector<std::string> nomes = {"a", "", "c"};
    std::vector<Ponto> pontos = {{1, 2}, {3, 4}};
    std::vector<int> vazio;
    std::vector<bool> bits = {true, false};
    std::map<std::string, int> mapa = {{"a", 1}};
    std::set<int> conjunto = {1, 2};
    std::stack<int> pilha;
    std::queue<int> fila;
    std::string texto = "abc";
    Caixa<int> caixa{1};
    std::unique_ptr<Forma> forma = std::make_unique<Quadrado>();
    std::shared_ptr<int> compartilhado = std::make_shared<int>(1);
    Forma *nulo = nullptr;
    grande[0] = 7; // PARE
    matriz[1][1] = 9;
    nomes.push_back("d");
    pontos[0].x = 9;
    mapa["b"] = 2;
    pilha.push(1);
    fila.push(1);
    std::cout << grande[0] << texto << forma->area() << *compartilhado << caixa.v << (nulo == nullptr) << std::endl;
    return 0;
}
