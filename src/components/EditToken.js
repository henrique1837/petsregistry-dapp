import React, { Component } from 'react';
import {
  Row,
  Col,
  Button,
  Alert,
  FormGroup,
  Label,
  Input,
  InputGroup,
  Table,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem
} from 'reactstrap';


import * as ResolverArtifact from '../contracts/Resolver.json';

class EditToken extends Component {
  state = {
    box: null,
    web3: null,
    events: [],
    tokensOwned: [],
    eventsMinted: [],
    transaction: null,
    editedUrl: ''
  }
  constructor(props) {
    super(props);
    this.getTokenAttrs = this.getTokenAttrs.bind(this);
    this.addVacine = this.addVacine.bind(this);
    this.setToken = this.setToken.bind(this);
    this.fileUpload = this.fileUpload.bind(this);
    this.addFamilyMember = this.addFamilyMember.bind(this);
    this.removePost = this.removePost.bind(this);

  }
  componentDidMount = async function () {
    const that = this;
    await this.setState({
      web3: this.props.web3,
      space: this.props.space,
      token: this.props.token,
      coinbase: this.props.coinbase,
      ipfs: this.props.ipfs,
      explorer: this.props.explorer
    });
    const token = this.props.token;
    console.log(this.props.coinbase)
    console.log(token)
    token.events.Transfer({
      filter: {to: this.props.coinbase},
      fromBlock: 0
    }, async function (err, res) {
      if (res) {
        console.log(res)
        const owner = await token.methods.ownerOf(res.returnValues.tokenId).call();
        console.log(owner);
        console.log(that.props.coinbase)
        console.log(owner.toLowerCase() == that.props.coinbase.toLowerCase())
        if(owner.toLowerCase() == that.props.coinbase.toLowerCase()){
          const tokenAttrs = await that.getTokenAttrs(res.returnValues.tokenId);
          console.log(tokenAttrs)
          that.state.tokensOwned.push(tokenAttrs);
          await that.forceUpdate();
        }
      }
    });

  }


  setToken = async (tokenId) => {
    try{
      await this.setState({
        events: [],
        eventsMinted: [],
        extensionSet: true,
        tokenAttrs: null,
        tokenId: null,
        image: null,
        txHash: null,
        warning: null
      })

      const that = this;
      await this.state.space.syncDone;
      const coinbase = this.state.coinbase;
      const tokenAttrs = await this.getTokenAttrs(tokenId);

      const defaultResolverAddr = await this.state.token.methods.RESOLVER_ADDRESS().call();
      let resolverAddress = await this.state.token.methods.resolverOf(tokenId).call();
      if(resolverAddress == "0x0000000000000000000000000000000000000000"){
        this.setState({
          warning: "Need to set resolver smart contract for this token id .... wait 1 confirmation after send transaction"
        });
        this.state.token.methods.resolveTo(defaultResolverAddr,tokenId)
        .send({from: coinbase});
        resolverAddress = defaultResolverAddr;
      }
      const resolver = new this.state.web3.eth.Contract(ResolverArtifact.abi,resolverAddress);
      const r_threadVacines = await resolver.methods.get(`vacines`,tokenId).call();
      const r_threadImages = await resolver.methods.get(`images`,tokenId).call();
      if((r_threadVacines != `vacines.${this.state.token.options.address}.${tokenId}`) &&
         (r_threadImages != `images.${this.state.token.options.address}.${tokenId}`)){
        this.setState({
          warning: "Need to set vacines, images and family thread in smart contract ...."
        });
        await resolver.methods.setMany(
          ['vacines','images','family'],
          [`vacines.${this.state.token.options.address}.${tokenId}`,`images.${this.state.token.options.address}.${tokenId}`,`family.${this.state.token.options.address}.${tokenId}`],
          [tokenId]
        )
        .estimateGas({from: coinbase});

        resolver.methods.setMany(
          ['vacines','images','family'],
          [`vacines.${this.state.token.options.address}.${tokenId}`,`images.${this.state.token.options.address}.${tokenId}`,`family.${this.state.token.options.address}.${tokenId}`],
          [tokenId]
        )
        .send({from: coinbase})
        .once('transactionHash', async function (hash) {
          that.setState({
            txHash: {
              confirmed: false,
              hash: hash
            },
            warning: null
          });
        })
        .once('confirmation', function (confirmationNumber, receipt) {
          that.setState({
            txHash: {
              confirmed: true,
              hash: receipt.transactionHash
            }
          });
        })
        .once('error', function (err) {
          that.setState({
            txHash: {
              confirmed: false,
              hash: null,
              err: err.message
            },
          });
        });
      }

      const threadVacines = await this.state.space.joinThread(`vacines.${this.state.token.options.address}.${tokenId}`,{members: true});
      const threadImages = await this.state.space.joinThread(`images.${this.state.token.options.address}.${tokenId}`,{members: true});
      const threadFamily = await this.state.space.joinThread(`family.${this.state.token.options.address}.${tokenId}`,{members: true});

      console.log(threadImages)
      const vacines = await threadVacines.getPosts();
      const family = await threadFamily.getPosts();
      const vets = await threadVacines.listMembers();
      const images = await threadImages.getPosts();

      /*
      for(const v of vacines){
        await threadVacines.deletePost(v.postId);
      }
      */
      console.log(vacines);
      console.log(tokenAttrs)
      await this.setState({
        resolver: resolver,
        tokenId: tokenId,
        threadVacines: threadVacines,
        vets: vets,
        threadImages: threadImages,
        vacines: vacines,
        images: images,
        threadFamily: threadFamily,
        family: family,
        tokenAttrs: tokenAttrs
      });
      this.state.threadVacines.onUpdate(async () => {
        const vacines = await this.state.threadVacines.getPosts();
        this.setState({
          vacines:vacines
        });
      });
      this.state.threadVacines.onNewCapabilities(async () => {
        const vets = await this.state.threadVacines.listMembers();
        this.setState({
          vets:vets
        });
      })
      this.state.threadImages.onUpdate(async () => {
        const images = await this.state.threadImages.getPosts();
        this.setState({
          images:images
        });
      })
      this.state.threadFamily.onUpdate(async () => {
        const family = await this.state.threadFamily.getPosts();
        this.setState({
          family:family
        });
      });
    } catch(err){
      console.log(err);
      this.setState({
        warning: err.message
      })
    }
  }
  addVacine = async () => {
    const drug = this.state.drug;
    const laboratory = this.state.laboratory;
    const date = this.state.date;
    const exp_date = this.state.exp_date;
    await this.state.threadVacines.post({
      drug: drug,
      laboratory: laboratory,
      date: date,
      exp_date: exp_date
    })
    this.setState({
      drug: null,
      laboratory: null,
      date: null,
      exp_date: null,
    })
  }
  setDrug = (e) => {
    e.preventDefault();
    this.setState({
      drug: e.target.value
    });
  }
  setLaboratory = (e) => {
    e.preventDefault();
    this.setState({
      laboratory: e.target.value
    });
  }
  setDateVacine = (e) => {
    e.preventDefault();
    this.setState({
      date: e.target.value
    });
  }
  setDateVacineExp = (e) => {
    e.preventDefault();
    this.setState({
      exp_date: e.target.value
    });
  }
  setVeterinary = (e) => {
    e.preventDefault();
    this.setState({
      vetWallet: e.target.value
    });
  }

  setFamMemberName = (e) => {
    this.setState({
      famMemberName: e.target.value
    })
  }
  setFamMemberType = (e) => {
    this.setState({
      famMemberType: e.currentTarget.textContent
    })
  }
  setFamMemberBreed = (e) => {
    this.setState({
      famMemberBreed: e.target.value
    })
  }
  setFamMemberTokenId = (e) => {
    this.setState({
      famMemberTokenId: e.target.value,
      famMemberName: null,
      famMemberBreed: null,
      famMemberBirthday: null,
      famMemberImage: null,
    });
  }

  setFamMemberImage = (e) => {
    try{
      const file = e.target.files[0];
      const reader  = new FileReader();
      const that = this;
      reader.onload = async function(c){
        const result = await that.state.ipfs.add(Buffer.from(c.target.result));
        const hash = result[0].hash;
        that.setState({
          famMemberImage: hash
        })
      }

      reader.readAsArrayBuffer(file);

    } catch(err){
      console.log(err)
    }

  }

  getTokenAttrs = async (tokenId) => {
    //try{
      console.log(tokenId)
      const ipfs = this.props.ipfs;
      const tokenUri = await this.props.token.methods.tokenURI(tokenId).call();
      const attrs = JSON.parse(await ipfs.cat(tokenUri.replace('ipfs://ipfs/', '')));
      const name = attrs.name;
      const breed = attrs.attributes[1].value;
      const birthday = attrs.attributes[2].value;
      const resolverAddress = await this.props.token.methods.resolverOf(tokenId).call();
      console.log(resolverAddress)
      const resolver = new this.props.web3.eth.Contract(ResolverArtifact.abi,resolverAddress);
      const vacines = await resolver.methods.get("vacines",tokenId).call();
      const images = await resolver.methods.get("images",tokenId).call();
      const family = await resolver.methods.get("family",tokenId).call();

      const owner = await this.props.token.methods.ownerOf(tokenId).call();

      const tokenAttrs = {
        tokenId: tokenId,
        owner: owner,
        uri: tokenUri.replace("ipfs://ipfs/",""),
        image: attrs.image,
        name: name,
        breed: breed,
        birthday: birthday,
        vacines: vacines,
        images: images,
        family: family
      }
      return(tokenAttrs)
    //}catch(err){
    //  console.log(err)
    //}

  }

  fileUpload = async function(e){
    try{
      const file = e.target.files[0];
      const type = file.type;
      const reader  = new FileReader();
      const that = this;
      reader.onload = async function(c){
        const result = await that.state.ipfs.add(Buffer.from(c.target.result));
        const hash = result[0].hash;
        await that.state.threadImages.post(hash);
      }

      reader.readAsArrayBuffer(file);

    } catch(err){
      console.log(err)
    }
  }



  addFamilyMember = async function(){

    let attrs;
    const ipfs = this.state.ipfs;
    const memberType = this.state.famMemberType;
    const mainTokenId = this.state.tokenId;
    const mainTokenUri = await this.props.token.methods.tokenURI(mainTokenId).call();
    const mainTokenAttrs = JSON.parse(await ipfs.cat(mainTokenUri.replace('ipfs://ipfs/', '')))
    const posts = await this.state.threadFamily.getPosts();
    for(const post of posts){
      if(((memberType.toLowerCase() == 'father') || (memberType.toLowerCase() == 'mother')) &&
         (post.message.memberType.toLowerCase() == memberType.toLowerCase())){
           return
         }
    }
    let uri;
    const tokenId = this.state.famMemberTokenId;
    if(tokenId){
      const tokenUri = await this.props.token.methods.tokenURI(tokenId).call();
      attrs = JSON.parse(await ipfs.cat(tokenUri.replace('ipfs://ipfs/', '')));
      uri = tokenUri;
    } else {
      attrs = {
        name: this.state.famMemberName,
        image: `https://ipfs.io/ipfs/${this.state.famMemberImage}`,
        external_url: `${window.location.href.split('/#')[0]}/#`,
        description: "Proof of Concept pet registry.",
        attributes: [
          {
            trait_type: "Name",
            value: this.state.famMemberName
          },
          {
            trait_type: "Breed",
            value: this.state.famMemberBreed
          },
          {
            trait_type: "Birthday",
            value: this.state.famMemberBirthday
          },
          {
            trait_type: "Type",
            value: mainTokenAttrs.attributes[3].value
          }
        ]
      };
      const res = await ipfs.add(ipfs.Buffer.from(JSON.stringify(attrs)),{onlyHash: false});
      //const uri = res[0].hash;
      uri = res[0].hash;
    }

    await this.state.threadFamily.post({
      memberType: memberType,
      uri: uri,
      attrs: attrs
    });
  }

  removePost = async (postId,threadId) => {
    try{
      if(threadId == 0){
        await this.state.threadVacines.deletePost(postId);
      }
      if(threadId == 1){
        await this.state.threadImages.deletePost(postId);
      }
      if(threadId == 2){
        await this.state.threadFamily.deletePost(postId);
      }
    } catch(err){
      console.log(err)
    }
  }

  render() {
    const that = this;
    return (
      <>
        {
          (
            this.state.warning &&
            (
              <Alert className='alertTx' color="warning">
                {this.state.warning}
              </Alert>
            )
          )
        }
        {
          (
            this.state.txHash &&
            this.state.txHash.hash &&
            !this.state.txHash.confirmed &&
            !this.state.txHash.err &&
            (
              <Alert className='alertTx' color="info">
                Transaction <a className='hashTx' href={`${this.state.explorer}/tx/${this.state.txHash.hash}`} target='_blank'>{this.state.txHash.hash}</a> sent to blockchain
              </Alert>
            )
          )
        }
        {
          (
            this.state.txHash &&
            this.state.txHash.hash &&
            this.state.txHash.confirmed &&
            !this.state.txHash.err &&
            (
              <Alert className='alertTx' color="success">
                Transaction <a className='hashTx' href={`${this.state.explorer}/tx/${this.state.txHash.hash}`} target='_blank'>{this.state.txHash.hash}</a> confirmed
              </Alert>
            )
          )
        }
        {
          (
            this.state.txHash &&
            this.state.txHash.err &&
            (
              <Alert color="danger">
                {this.state.txHash.err}
              </Alert>
            )
          )
        }
        {
          (
            this.state.token &&
            (
              <>
                <h4>Edit Tokens</h4>
                <p>Token Contract Address: <a className='address' href={`${this.state.explorer}/token/${this.state.token.options.address}`} target='_blank'>{this.state.token.options.address}</a></p>
                <div style={{ paddingBottom: '50px' }}>
                  <FormGroup>

                    <div>

                      {
                        (
                          (this.state.tokensOwned.length > 0) &&
                          (
                            <>
                              <h4>Tokens Owned by You</h4>
                              <Table responsive hover>
                                <thead>
                                  <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Breed</th>
                                    <th>Image</th>
                                    <th>Info</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {
                                    this.state.tokensOwned.map(tokenAttrs => {
                                      const name = tokenAttrs.name;
                                      const id = tokenAttrs.tokenId;
                                      const breed = tokenAttrs.breed;
                                      const image = tokenAttrs.image;
                                      return (
                                        <tr>
                                          <td>{id}</td>
                                          <td>{name}</td>
                                          <td>{breed}</td>
                                          <td><center><img src={image} style={{ width: '30px' }} /></center></td>
                                          <td><Button onClick={() => {that.setToken(id)}}>View Info</Button></td>
                                        </tr>
                                      )
                                    })
                                  }
                                </tbody>
                              </Table>
                            </>
                          )
                        )
                      }
                    </div>
                    <div>
                      {
                        (
                          this.state.tokenAttrs &&
                          (
                            <Row className='mob' style={{ paddingBottom: '50px' }}>
                              <Col lg={10}>
                                <h5>Pet's Name: {this.state.tokenAttrs.name}</h5>
                                <p>Breed: {this.state.tokenAttrs.breed}</p>
                                <p>Birthday: {this.state.tokenAttrs.birthday}</p>
                                <p>Owner: {this.state.tokenAttrs.owner}</p>
                                <p>URI: <a href={`https://ipfs.io/ipfs/${this.state.tokenAttrs.uri.replace('ipfs://ipfs/', '')}`} target='_blank'>{this.state.tokenAttrs.uri}</a></p>
                                <p>TokenId: <span className='mob-tiny'>{this.state.tokenAttrs.tokenId}</span></p>
                              </Col>
                              <Col lg={2} style={{ textAlign: 'center' }}>
                                <img src={this.state.tokenAttrs.image} style={{ width: '150px', verticalAlign: 'middle' }} />
                              </Col>
                            </Row>
                          )
                        )
                      }
                    </div>
                    {
                      (
                        this.state.tokenId &&
                        this.state.vacines &&
                        (
                          <div style={{paddingTop: '25px'}}>
                          <h5>Add pet's vacine</h5>
                          <Row>
                            <Col lg={2}>
                              <Label>Drug</Label>
                            </Col>
                            <Col lg={10}>
                              <InputGroup className="input-group-alternative mb-4">
                                <Input
                                  className="form-control-alternative"
                                  placeholder="Enter drug name"
                                  type="text"
                                  onChange={this.setDrug}
                                />
                              </InputGroup>
                            </Col>
                          </Row>
                          <Row>
                            <Col lg={2}>
                              <Label>Laboratory</Label>
                            </Col>
                            <Col lg={10}>
                              <InputGroup className="input-group-alternative mb-4">
                                <Input
                                  className="form-control-alternative"
                                  placeholder="Enter drug laboratory"
                                  type="text"
                                  onChange={this.setLaboratory}
                                />
                              </InputGroup>
                            </Col>
                          </Row>
                          <Row>
                            <Col lg={2}>
                              <Label>Date</Label>
                            </Col>
                            <Col lg={10}>
                              <InputGroup className="input-group-alternative mb-4">
                                <input type="date" onChange={this.setDateVacine}/>
                              </InputGroup>
                            </Col>
                          </Row>

                          </div>
                        )
                      )
                    }

                    {
                      (
                        this.state.tokenId &&
                        this.state.vacines &&
                        (
                          <Button onClick={this.addVacine}>Add Vacine</Button>
                        )
                      )
                    }
                    {
                      (
                        (this.state.vacines) &&
                        (
                          <div>
                          <h4>Vacines</h4>
                          {
                            this.state.vacines.map((post) => {
                              return(
                                <div style={{paddingTop:'10px'}}>
                                  <p>Drug: {post.message.drug}</p>
                                  <p>Laboratory: {post.message.laboratory}</p>
                                  <p>Date: {post.message.date}</p>
                                  <Button color='danger' onClick={()=>{this.removePost(post.postId,0)}}>Remove</Button>
                                </div>
                              )
                            })
                          }
                          </div>
                        )
                      )
                    }
                    {
                      (
                        this.state.tokenId &&
                        this.state.family &&
                        (
                          <div style={{paddingTop:'25px'}}>
                          <h5>Add pet's family member</h5>
                          <Row>
                            <Col lg={2}>
                              <Label>TokenId</Label>
                            </Col>
                            <Col lg={10}>
                              <InputGroup className="input-group-alternative mb-4">
                                <Input
                                  className="form-control-alternative"
                                  placeholder="Enter family tokenId if exists"
                                  type="text"
                                  onChange={this.setFamMemberTokenId}
                                />
                              </InputGroup>
                            </Col>
                          </Row>
                          <UncontrolledDropdown>
                            <DropdownToggle caret>
                              {
                                (
                                  this.state.famMemberType &&
                                  (
                                    <>
                                    {this.state.famMemberType}
                                    </>
                                  )
                                )
                              }
                              {
                                (
                                  !this.state.famMemberType &&
                                  (
                                    <>
                                    Select
                                    </>
                                  )
                                )
                              }
                            </DropdownToggle>
                            <DropdownMenu>
                              <DropdownItem onClick={this.setFamMemberType}>Mother</DropdownItem>
                              <DropdownItem divider />
                              <DropdownItem onClick={this.setFamMemberType}>Father</DropdownItem>
                              <DropdownItem divider />
                              <DropdownItem onClick={this.setFamMemberType}>Sister</DropdownItem>
                              <DropdownItem divider />
                              <DropdownItem onClick={this.setFamMemberType}>Brother</DropdownItem>
                              <DropdownItem divider />
                              <DropdownItem onClick={this.setFamMemberType}>Son</DropdownItem>
                              <DropdownItem divider />
                              <DropdownItem onClick={this.setFamMemberType}>Daughter</DropdownItem>
                            </DropdownMenu>
                          </UncontrolledDropdown>
                          {
                            (
                              !this.state.famMemberTokenId &&
                              (
                                <>
                                <Row>
                                  <Col lg={2}>
                                    <Label>Name</Label>
                                  </Col>
                                  <Col lg={10}>
                                    <InputGroup className="input-group-alternative mb-4">
                                      <Input
                                        className="form-control-alternative"
                                        placeholder="Enter family member name"
                                        type="text"
                                        onChange={this.setFamMemberName}
                                      />
                                    </InputGroup>
                                  </Col>
                                </Row>
                                <Row>
                                  <Col lg={2}>
                                    <Label>Breed</Label>
                                  </Col>
                                  <Col lg={10}>
                                    <InputGroup className="input-group-alternative mb-4">
                                      <Input
                                        className="form-control-alternative"
                                        placeholder="Enter family member breed"
                                        type="text"
                                        onChange={this.setFamMemberBreed}
                                      />
                                    </InputGroup>
                                  </Col>
                                </Row>
                                <Row>
                                  <Col lg={2}>
                                    <Label>Birthday</Label>
                                  </Col>
                                  <Col lg={10}>
                                    <InputGroup className="input-group-alternative mb-4">
                                      <input type="date" onChange={this.setFamMemberBirthday}/>
                                    </InputGroup>
                                  </Col>
                                </Row>
                                <Row>
                                  <Col lg={2}>
                                    <Label>Image</Label>
                                  </Col>
                                  <Col lg={10}>
                                    <InputGroup className="input-group-alternative mb-4">
                                      <input type="file" onChange={this.setFamMemberImage}/>
                                    </InputGroup>
                                  </Col>
                                </Row>
                                </>
                              )
                            )
                          }

                          <div>
                            <Button onClick={this.addFamilyMember}>Add Family Member</Button>
                          </div>

                          {
                            (
                              (this.state.family) &&
                              (
                                <>
                                <Col lg={12}>
                                  <h4>Family</h4>
                                </Col>
                                {
                                  this.state.family.map((post) => {
                                    return(
                                      <Col style={{marginTop:'20px'}} lg={4}>
                                        {
                                          (
                                            post.message.tokenId &&
                                            (
                                              <p>TokenId: <a href={`https://ipfs.io/ipfs/${post.message.tokenId}`} target='_blank'>{post.message.tokenId}</a></p>
                                            )
                                          )
                                        }
                                        <h4>{post.message.memberType}</h4>
                                        <p>Name: {post.message.attrs.name}</p>
                                        <p>Breed: {post.message.attrs.attributes[1].value}</p>
                                        <p>Birthday: {post.message.attrs.attributes[2].value}</p>
                                        <p>Type: {post.message.attrs.attributes[3].value}</p>
                                        <center>
                                          <img src={post.message.attrs.image} style={{width: '200px'}}/>
                                        </center>
                                        <Button color='danger' onClick={()=>{this.removePost(post.postId,2)}}>Remove</Button>
                                      </Col>
                                    )
                                  })
                                }
                                </>
                              )
                            )
                          }
                          </div>
                        )
                      )
                    }
                    {
                      (
                        this.state.tokenId &&
                        this.state.images &&
                        (
                          <div style={{paddingTop: '25px'}}>
                          <h5>Add pet's images</h5>
                          <Row>
                            <Col lg={2}>
                              <Label>Image</Label>
                            </Col>
                            <Col lg={10}>
                              <InputGroup className="input-group-alternative mb-4">
                                <input type="file" onChange={this.fileUpload}/>
                              </InputGroup>
                            </Col>
                          </Row>
                          </div>
                        )
                      )
                    }
                    <Row>
                    {
                      (
                        (this.state.images) &&
                        (
                          <>
                          <Col lg={12}>
                            <h4>Images</h4>
                          </Col>
                          {
                            this.state.images.map((post) => {
                              return(
                                <Col style={{textAlign:'center',marginTop:'20px'}} lg={4}>
                                  <div>
                                    <img src={`https://ipfs.io/ipfs/${post.message}`} style={{width: '200px'}}/>
                                  </div>
                                  <Button color='danger' onClick={()=>{this.removePost(post.postId,1)}}>Remove</Button>
                                </Col>
                              )
                            })
                          }
                          </>
                        )
                      )
                    }
                    </Row>


                  </FormGroup>

                </div>
              </>
            )
          )
        }




      </>
    );
  }

}
export default EditToken;
