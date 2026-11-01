const matriz = Array.from({ length: 300 }, (_, i) => Array.from({ length: 300 }, (_, j) => i * j));
matriz[0][0] = 7; // PARE
matriz[0][1] = 8;
matriz[0][2] = 9;
console.log('fim');
