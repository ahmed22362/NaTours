#include <bits/stdc++.h>
#include <vector>
using namespace std;

int main()
{
    // problem1();
    // problem2();
    // problem3();
    // problem4();
    // problem5();
    problem6();
    // problem7();
    return 0;
}
void problem6()
{
    long n, pointer;
    cin >> n;
    pointer = n;
    vector<long> inputs = input_long_vector(n), freq;
    freq.assign(n, 0);
    for (auto i = 0; i < n; i++)
    {
        freq[inputs[i]] = 1;
        for (auto x = 0; x < n; x++)
        {
            if (freq[pointer])
            {
                cout << pointer << " ";
                pointer--;
            }
            else
            {
                cout << endl;
                break;
            }
        }
    }
}